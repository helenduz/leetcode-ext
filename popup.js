document.addEventListener("DOMContentLoaded", function () {
    console.log("inside outer listener, initial items in chrome storage:");
    setErrorMessageForCurProblem();

    chrome.storage.onChanged.addListener(function (changes, namespace) {
        printChangedItems(changes, namespace);
        setErrorMessageForCurProblem();
    });
});

function setErrorMessageForCurProblem() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tabUrl = new URL(tabs[0].url);
        if (!isLeetCodeProb(tabUrl)) {
            document.getElementById("error-display").innerHTML =
                "Go to a LeetCode problem to use this extension!";
            return;
        }
        var problemName = getProblemNameFromUrl(tabUrl);
        chrome.storage.local.get().then((items) => {
            console.log(items);
            var errorMessage = items[problemName]; // if no error message (success), returns undefined
            if (!errorMessage) {
                document.getElementById("error-display").innerHTML = "All good";
            } else {
                document.getElementById("error-display").innerHTML =
                    errorMessage;
            }
        });
    });
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