function isLeetCodeProb(url) {
    return (
        url.protocol === "https:" &&
        url.hostname === "leetcode.com" &&
        url.pathname.startsWith("/problems/")
    );
}

function getProblemNameFromUrl(url) {
    return url.pathname.split("/")[2];
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

export { isLeetCodeProb, getProblemNameFromUrl, getSubmittedContent };
