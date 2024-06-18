document.addEventListener("DOMContentLoaded", function () {
    console.log("inside outer listener, initial items in chrome storage:");
    setErrorMessageForCurProblem();

    chrome.storage.onChanged.addListener(function (changes, namespace) {
        printChangedItems(changes, namespace);
        setErrorMessageForCurProblem();
    });
});

function getProblemNameFromUrl(urlStr) {
    const url = new URL(urlStr);
    return url.pathname.split("/")[2];
}

function setErrorMessageForCurProblem() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var problemName = getProblemNameFromUrl(tabs[0].url);
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
