import {
    isLeetCodeProb,
    getProblemNameFromUrl,
    getSubmittedContent,
} from "./utils.js";

let submissionContent = null;
let curProblemName = null;

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
                if (tabs.length > 0 && tabs[0].id) {
                    updateIconForTab(tabs[0].id);
                }
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
                handleProblemSubmit,
                { urls: ["*://leetcode.com/submissions/detail/*/check/"] },
                ["responseHeaders"]
            );
        },
        { urls: ["*://leetcode.com/problems/*/submit/"] },
        ["requestBody"]
    );
}

async function handleProblemSubmit(details) {
    // Check response headers to see if submission is successful
    for (var i = 0; i < details.responseHeaders.length; ++i) {
        // Submission is not yet successful since the response has fixed length, skip to next request from listener
        if (details.responseHeaders[i].name === "content-length") {
            return;
        }
    }
    // Submission success, remove listener and fetch to /check to get result
    chrome.webRequest.onCompleted.removeListener(handleProblemSubmit);

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
            "handleProblemSubmit: successfully made call to /check, result:",
            data
        );
        // TODO: allow user to select if they want to add notes even when submission is accepted (data.status_msg == "Accepted")
        const userPrompt = await getUserPromptFromStorage();
        if (userPrompt) {
            // note: we only call backend if user has input a prompt
            let aiResponse = await callBackend({
                code: submissionContent.code,
                analysis: submissionContent.analysis,
                result: data,
                prompt: userPrompt,
            });
            await pingContentScript(
                aiResponse,
                details.tabId,
                data.question_id
            );
            setCurProblemErrorMessage(null);
        }
    } catch (error) {
        setCurProblemErrorMessage(
            `An error occurred in our server when you last submitted this problem: ${error}` // TODO: use aiResponse.message?
        );
        console.error("handleProblemSubmit errors:", error);
    }
}

async function callBackend({ code, analysis, result, prompt }) {
    // TODO: after deployment, replace with deployed URL
    try {
        console.log("Calling backend");
        const response = await fetch(
            "https://leetnote-backend.helenduz.workers.dev/",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code: code,
                    analysis: analysis,
                    result: result,
                    prompt: prompt,
                }),
            }
        );
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
        payload: aiResponse.data + "\n",
        questionId: questionIdStr,
    };
    await chrome.tabs.sendMessage(tabId, packetToContentScript);
}

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
        if (chrome.runtime.lastError) return;
        if (!tab) return;
        // Note: non-LeetCode pages and success status would have default icons
        if (tab.url && isLeetCodeProb(new URL(tab.url))) {
            var problemName = getProblemNameFromUrl(new URL(tab.url));
            chrome.storage.local.get().then((items) => {
                var errorMessage = items[problemName];
                if (errorMessage) {
                    // Use error icon if something is wrong with this problem
                    chrome.action.setIcon({
                        path: "./icons/error128.png",
                        tabId: tabId,
                    });
                    return;
                }
            });
        }
        chrome.action.setIcon({ path: "./icons/icon128.png", tabId: tabId });
    });
}

async function getUserPromptFromStorage() {
    var key = "prompt";
    var prompObject = await chrome.storage.session.get(key);
    const promptMsg = prompObject[key] || "";
    console.log(`user prompt from storage for ${key}:`, promptMsg);
    return promptMsg;
}

run();
