let submissionContent = null;

function run() {
    // Monitor POST requests to /submit
    chrome.webRequest.onBeforeRequest.addListener(
        function (details) {
            console.log(details.url);
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
            // TODO: should ultimately notify user somehow of error
            console.error("Fetch to /check errors:", response.statusText);
        }
        const data = await response.json();
        console.log(
            "checkAndFetchResult: successfully made call to /check, result:",
            data
        );
        // Note: we only call backend when submission is not accepted
        if (data.status_msg !== "Accepted") {
            let aiResponse = await callBackend(data);
            pingContentScript(aiResponse, details.tabId, data.question_id);
        }
    } catch (error) {
        // TODO: should ultimately notify user somehow of error
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
        const data = await response.json();
        console.log("Backend response:", data);

        if (!response.ok) {
            // TODO: somehow notify user of error
            console.error("Backend response errors: ", response.message);
        }
        return data;
    } catch (error) {
        // TODO: somehow notify user of error
        console.error(error);
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
