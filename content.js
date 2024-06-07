chrome.runtime.onMessage.addListener(function (request) {
    var data = {
        // TODO: payload: expecting a string currently, can be array of strings if needed later
        payload: request.payload,
        questionId: request.questionId,
    };
    const dispatchRes = document.dispatchEvent(
        new CustomEvent("lce-msg", { detail: data })
    );
    console.log("dispatchRes: ", dispatchRes);
});
