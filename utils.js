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
        const language = parsedPayload.lang;
        return extractCodeAndAnalysis(text, language);
    } catch (e) {
        console.error("Error:", e);
        return null;
    }
}

function extractCodeAndAnalysis(text, language) {
    const analysisIndex = text.indexOf("## --analysis-- ##");
    var analysisText = "";
    var codeText = "";
    if (analysisIndex !== -1) {
        codeText = text.substring(0, analysisIndex).trim();
        analysisText = text
            .substring(analysisIndex + "## --analysis-- ##".length)
            .trim();
    } else {
        codeText = removeComments(text.trim(), language);
    }

    return {
        code: codeText,
        analysis: analysisText,
    };
}

function removeComments(text, language) {
    const commentDelimiters = {
        javascript: "//",
        python: "#",
        html: "<!--",
        sql: "--",
        python3: "#",
        java: "//",
        cpp: "//",
        csharp: "//",
        php: "//",
        swift: "//",
        kotlin: "//",
        dart: "//",
        go: "//",
        ruby: "#",
        scala: "//",
        rust: "//",
        typescript: "//",
        racket: ";",
        erlang: "%",
        elixir: "#",
    };
    // break the code into lines
    const codeLines = text.split("\n");
    // remove lines that start with comment delimiter
    const codeWithoutComments = codeLines.filter(
        (line) => !line.startsWith(commentDelimiters[language])
    );
    return codeWithoutComments.join("\n");
}

export { isLeetCodeProb, getProblemNameFromUrl, getSubmittedContent };
