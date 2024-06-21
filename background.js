import { isLeetCodeProb, getProblemNameFromUrl } from "./utils.js";

let submissionContent = null;
let curProblemName = null;

function setCurProblemErrorMessage(errorMessage) {
    // Note: this function only involves actions with storage, other pieces react to storage changes
    // popup.js has listener that updates message in popup, and also will get the message from storage in startup
    // background.js has listener on tab update AND storage changes, set icon based on storage
    // storage: {err_problem_name: "some message"}, non existent key means no error
    if (!errorMessage) {
        // no error, removes from storage
        // FIXME: does this error if key doesn't exist?
        chrome.storage.local.remove([curProblemName]);
    } else {
        // sets error message in storage
        chrome.storage.local.set({ [curProblemName]: errorMessage });
    }
}

function updateIconForTab(tabId) {
    // Get tab from tabId via chrome tabs query
    chrome.tabs.get(tabId, function (tab) {
        // Note: non-LeetCode pages and success status would have default icons
        if (tab.url && isLeetCodeProb(new URL(tab.url))) {
            var problemName = getProblemNameFromUrl(new URL(tab.url));
            chrome.storage.local.get().then((items) => {
                var errorMessage = items[problemName];
                if (errorMessage) {
                    // Use error icon if something is wrong with this problem
                    chrome.action.setIcon({
                        path: "./icons/error16.png",
                        tabId: tabId,
                    });
                    return;
                }
            });
        }
        chrome.action.setIcon({ path: "./icons/icon16.png", tabId: tabId });
    });
}

function run() {
    // Monitor changes in storage and tab change to set icon for corresponding status
    chrome.tabs.onActivated.addListener((activeInfo) => {
        updateIconForTab(activeInfo.tabId);
    });
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === "complete" && tab.url) {
            updateIconForTab(tabId);
        }
    });
    chrome.storage.onChanged.addListener(function () {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                updateIconForTab(tabs[0].id);
            }
        );
    });

    // Monitor POST requests to /submit
    chrome.webRequest.onBeforeRequest.addListener(
        function (details) {
            console.log(details.url);
            curProblemName = getProblemNameFromUrl(new URL(details.url));
            submissionContent = getSubmittedContent(details);
            // TODO: error handling when content is null
            chrome.webRequest.onCompleted.addListener(
                checkAndFetchResult,
                { urls: ["*://leetcode.com/submissions/detail/*/check/"] },
                ["responseHeaders"]
            );
        },
        { urls: ["*://leetcode.com/problems/*/submit/"] },
        ["requestBody"]
    );
}

function getSubmittedContent(details) {
    const decoder = new TextDecoder("utf-8");
    const requestBodyRaw = details.requestBody.raw[0].bytes;
    const requestBody = decoder.decode(requestBodyRaw);

    try {
        const parsedPayload = JSON.parse(requestBody);
        const text = parsedPayload.typed_code;
        return extractCodeAndAnalysis(text);
    } catch (e) {
        console.error("Error:", e);
        return null;
    }
}

function extractCodeAndAnalysis(text) {
    const analysisIndex = text.indexOf("## --analysis-- ##");
    var analysisText = "";
    var codeText = "";
    if (analysisIndex !== -1) {
        codeText = text.substring(0, analysisIndex).trim();
        analysisText = text
            .substring(analysisIndex + "## --analysis-- ##".length)
            .trim();
    } else {
        codeText = text.trim();
    }

    return {
        code: codeText,
        analysis: analysisText,
    };
}

async function checkAndFetchResult(details) {
    // Check response headers to see if submission is successful
    for (var i = 0; i < details.responseHeaders.length; ++i) {
        // Submission is not yet successful since the response has fixed length, skip to next request from listener
        if (details.responseHeaders[i].name === "content-length") {
            return;
        }
    }
    // Submission success, remove listener and fetch to /check to get result
    chrome.webRequest.onCompleted.removeListener(checkAndFetchResult);

    try {
        const response = await fetch(details.url);
        if (!response.ok) {
            setCurProblemErrorMessage(
                "An error occurred when connecting to LeetCode"
            );
            console.error("Fetch to /check errors:", response.statusText);
            return;
        }
        const data = await response.json();
        console.log(
            "checkAndFetchResult: successfully made call to /check, result:",
            data
        );
        // Note: we only call backend when submission is not accepted
        if (data.status_msg !== "Accepted") {
            let aiResponse = await callBackend(data);
            await pingContentScript(
                aiResponse,
                details.tabId,
                data.question_id
            );
            setCurProblemErrorMessage(null);
        }
    } catch (error) {
        setCurProblemErrorMessage(
            `An error occurred in our server when you last submitted this problem: ${error}`
        );
        console.error("checkAndFetchResult errors:", error);
    }
}

async function callBackend(submissionResult) {
    // TODO: after deployment, replace with deployed URL
    try {
        const response = await fetch("http://localhost:8787", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                code: submissionContent.code,
                analysis: submissionContent.analysis,
                result: submissionResult,
            }),
        });
        if (!response.ok) {
            throw new Error("Backend API call errors");
        }
        const data = await response.json();
        console.log("Backend response:", data);
        return data;
    } catch (error) {
        throw new Error(error);
    }
}

async function pingContentScript(aiResponse, tabId, questionIdStr) {
    console.log("pingContentScript:", tabId);
    const packetToContentScript = {
        payload: aiResponse.data || `Error: ${aiResponse.message}`, // backend returns data if successful or else returns error message
        questionId: questionIdStr,
    };
    await chrome.tabs.sendMessage(tabId, packetToContentScript);
}

run();
