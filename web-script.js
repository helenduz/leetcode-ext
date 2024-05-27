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
            appendCommentToMonacoEditor(languageId, data.message);
        });
    } else {
        console.log("Monaco Editor is not available. Retrying in 500ms.");
        setTimeout(main, 500);
    }
}

function appendCommentToMonacoEditor(language, newCode) {
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
        console.log(`currentContent: ${currentContent}`);
        const comment = `${delimiter} ${newCode}`;
        const combinedContent = currentContent + "\n" + comment;
        editor.setValue(combinedContent);
        console.log("content is set");
    }
}
