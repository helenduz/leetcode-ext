document.getElementById("prompt-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const prompt = document.getElementById("prompt-input").value;
    // TODO: add dompurify for input sanitization
    var key = "prompt";
    chrome.storage.session.set({ [key]: prompt });
    console.log(`set ${key} to ${prompt}`);
});

document.addEventListener("DOMContentLoaded", function () {
    console.log("inside outer listener, initial items in chrome storage:");
    initializePopup();

    chrome.storage.onChanged.addListener(function (changes, namespace) {
        printChangedItems(changes, namespace);
        if (namespace === "local") {
            setErrorMessageForCurProblem();
        }
    });
});

function initializePopup() {
    setErrorMessageForCurProblem();
    setPromptFromStorage();
}

function setErrorMessageForCurProblem() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tabUrl = new URL(tabs[0].url);
        if (!isLeetCodeProb(tabUrl)) {
            document.getElementById("error-display").innerHTML =
                "Go to a LeetCode problem to use this extension!";
            // TODO: better way to hide prompt form
            document.getElementById("prompt").style.display = "none";
            return;
        }
        var problemName = getProblemNameFromUrl(tabUrl);
        chrome.storage.local.get().then((items) => {
            console.log(items);
            var errorMessage = items[problemName]; // if no error message (success), returns undefined
            if (!errorMessage) {
                document.getElementById("error-display").innerHTML =
                    "All good, no errors!";
            } else {
                document.getElementById("error-display").innerHTML =
                    errorMessage;
            }
        });
    });
}

async function setPromptFromStorage() {
    var key = "prompt";
    var prompObject = await chrome.storage.session.get(key);
    const promptMsg = prompObject[key] || "";
    document.getElementById("prompt-input").value = promptMsg;
}

function printChangedItems(changes, namespace) {
    if (namespace === "local") {
        for (var key in changes) {
            var storageChange = changes[key];
            console.log(
                'Storage key "%s" in namespace "%s" changed. ' +
                    'Old value was "%s", new value is "%s".',
                key,
                namespace,
                storageChange.oldValue,
                storageChange.newValue
            );
        }
    }
}

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
