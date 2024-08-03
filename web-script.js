window.addEventListener("load", () => {
    main();
});

function main() {
    if (
        typeof monaco !== "undefined" &&
        typeof monaco.editor.getModels()[0] !== "undefined" &&
        monaco.editor.getModels()[0].getValue().length > 0
    ) {
        console.log("Monaco Editor is available:");
        console.log(monaco);

        document.addEventListener("lce-msg", function (e) {
            var data = e.detail;
            console.log("received event:", data);

            var languageId = monaco.editor.getModels()[0].getLanguageId();
            appendCommentToMonacoEditor(
                languageId,
                data.payload,
                data.questionId
            );
        });
    } else {
        console.log("Monaco Editor is not available. Retrying in 500ms.");
        setTimeout(main, 500);
    }
}

function appendCommentToMonacoEditor(language, newCode, questionId) {
    const commentDelimiters = {
        javascript: "//",
        python: "#",
        html: "<!--",
        sql: "--",
        python3: "#",
        // Add more languages and their delimiters as needed.
    };

    const delimiter = commentDelimiters[language] || "//"; // Default to '//' if the language is not listed.

    const editor = monaco.editor.getModels()[0];
    if (editor) {
        const currentContent = editor.getValue();
        const newLines = newCode.trim().split("\n");
        const comment = newLines
            .map((line) => `${delimiter} ${line}`)
            .join("\n");
        const combinedContent = currentContent + "\n" + comment;
        editor.setValue(combinedContent);

        // update local storage for editor's cotent
        for (var i = 0; i < localStorage.length; i++) {
            const curKey = localStorage.key(i);
            if (isKeyForCurrentEditor(curKey, questionId, language)) {
                localStorage.setItem(curKey, combinedContent);
            }
        }
    }
}

function isKeyForCurrentEditor(str, questionId, language) {
    // search local storage for key that starts with questionId and ends with language
    // note: language should be in lowercase
    const regex = new RegExp(`^${questionId}.*${language}$`);
    return regex.test(str);
}
