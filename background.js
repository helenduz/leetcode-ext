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
        // TODO: uncomment below i.e. only call backend when submission not accepted
        // if (data.status_msg !== "Accepted") {
        //     const aiResponse = await callBackend(data);
        //     pingContentScript(aiResponse);
        // }
        const aiResponse = await callBackend(data);
        await pingContentScript(aiResponse, details.tabId, data.question_id);
    } catch (error) {
        // TODO: should ultimately notify user somehow of error
        console.error("checkAndFetchResult errors:", error);
    }
}

async function callBackend(submissionResult) {
    // TODO: should call backend server once set up
    const apiKey = "REPLACE_WITH_API_KEY";
    const prompt = {
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant.",
            },
            {
                role: "user",
                content:
                    "this is my code " +
                    submissionContent.code +
                    "this is the submission result " +
                    // TODO: check if full_runtime_error is null
                    submissionResult.full_runtime_error +
                    " :give me a 50 word report on the errors and time complexity ",
            },
        ],
    };

    try {
        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + apiKey,
                },
                body: JSON.stringify(prompt),
            }
        );
        const data = await response.json();
        console.log("openAI response:", data);
        return data;
    } catch (error) {
        // TODO: should ultimately notify user somehow of error
        console.error("Error from openAI call:", error);
    }
}

async function pingContentScript(aiResponse, tabId, questionIdStr) {
    console.log("pingContentScript:", tabId);
    // TODO: unpack aiResponse (should be a json from backend, already in JS object) into format we want
    const packetToContentScript = {
        payload: aiResponse,
        questionId: questionIdStr,
    };
    await chrome.tabs.sendMessage(tabId, packetToContentScript);
}

run();
