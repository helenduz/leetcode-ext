// Listener to update prompt in chrome storage
document.getElementById("prompt-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const prompt = document.getElementById("prompt-input").value;
    // TODO: add dompurify for input sanitization
    var key = "prompt";
    chrome.storage.session.set({ [key]: prompt });
    console.log(`set ${key} to ${prompt}`);
});

// Listener to initialize/update header and status
document.addEventListener("DOMContentLoaded", async function () {
    console.log("inside outer listener, initial items in chrome storage:");
    await initializePopup();

    chrome.storage.onChanged.addListener(async function (changes, namespace) {
        printChangedItems(changes, namespace);
        if (namespace === "local") {
            setStatusFromStorage();
        }
    });
});

// Listener to set extension on/off status in chrome storage
document
    .getElementById("on-off-button")
    .addEventListener("change", async function () {
        var key = "extension-on";
        var value = this.checked;
        chrome.storage.session.set({ [key]: value });
        console.log(`set ${key} to ${value}`);
        await setSections();
    });

async function initializePopup() {
    await setOnOffFromStorage();
    await setSections();
    await setPromptFromStorage();
    setStatusFromStorage();
}

async function setOnOffFromStorage() {
    var key = "extension-on";
    var onOffObject = await chrome.storage.session.get(key);
    let onOff = onOffObject[key];
    if (!onOff) {
        onOff = false;
    } // default to off if not yet set in storage
    console.log(`on-off status from storage: ${onOff}`);
    document.getElementById("on-off-button").checked = onOff;
}

// Update popup sections based on whether websit is leetcode or not & on/off status from storage
async function setSections() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tabUrl = new URL(tabs[0].url);
        if (!isLeetCodeProb(tabUrl)) {
            // Hide prompt & info section + disable on/off if not on leetcode
            document.getElementById("prompt").style.display = "none";
            document.getElementById("layout_info").style.display = "none";
            document.getElementById("on-off-button").disabled = true;
            document.getElementById("on-off-button").checked = false;
            return;
        } else {
            // Hide alert section if on leetcode
            document.getElementById("layout_alert").style.display = "none";
        }
    });
    var key = "extension-on";
    var onOffObject = await chrome.storage.session.get(key);
    let onOff = onOffObject[key];
    document.getElementById("on-off-button").checked = onOff;
    if (!onOff) {
        document.getElementById("prompt").style.display = "none";
        document.getElementById("layout_info").style.display = "none";
    } else {
        document.getElementById("prompt").style.display = "block";
        document.getElementById("layout_info").style.display = "block";
    }
}

// Update status section based on error message in storage for current problem
function setStatusFromStorage() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tabUrl = new URL(tabs[0].url);
        var problemName = getProblemNameFromUrl(tabUrl);
        chrome.storage.local.get().then((items) => {
            console.log(items);
            var errorMessage = items[problemName]; // if no error message (success), returns undefined
            if (!errorMessage) {
                document.getElementById("info-status-text").innerHTML =
                    "All good, no errors!";
            } else {
                document.getElementById("info-status-text").innerHTML =
                    errorMessage;
            }
        });
    });
}

async function setPromptFromStorage() {
    var key = "prompt";
    var prompObject = await chrome.storage.session.get(key);
    const promptMsg = prompObject[key] || "";
    document.getElementById("prompt-input").innerHTML = promptMsg;
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

// Styling save button
document.getElementById("save-btn").addEventListener("click", function () {
    var button = this;
    // SVG icon for "done"
    var checkmarkSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="240" height="240" viewBox="0,0,256,256"
        style="fill:#000000;">
            <g fill="none" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal">
                <g transform="scale(5.33333,5.33333)">
                    <path d="M44,24c0,11.045 -8.955,20 -20,20c-11.045,0 -20,-8.955 -20,-20c0,-11.045 8.955,-20 20,-20c11.045,0 20,8.955 20,20z" fill="#ffb689"></path>
                    <path d="M34.586,14.586l-13.57,13.586l-5.602,-5.586l-2.828,2.828l8.434,8.414l16.395,-16.414z" fill="#ffffff"></path>
                </g>
            </g>
        </svg>`;

    button.classList.add("done");
    button.innerHTML = checkmarkSvg;

    setTimeout(function () {
        button.innerHTML = "Save";
        button.classList.remove("done");
        button.style.fontSize = ""; // Reset font size
    }, 1000);
});
