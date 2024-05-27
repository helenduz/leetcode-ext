chrome.runtime.onMessage.addListener(function (request) {
    var data = {
        // TODO: message: expecting a string currently, can be array of strings if needed later
        message: request.payload,
    };
    const dispatchRes = document.dispatchEvent(
        new CustomEvent("lce-msg", { detail: data })
    );
    console.log("dispatchRes: ", dispatchRes);

    return true;
});

// setTimeout(() => {
//     var data = {
//         message: "will I be persisted",
//     };
//     const dispatchRes = document.dispatchEvent(
//         new CustomEvent("lce-msg", { detail: data })
//     );
//     console.log("dispatchRes: ", dispatchRes);
// }, 10000);
