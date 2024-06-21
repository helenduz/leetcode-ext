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

export { isLeetCodeProb, getProblemNameFromUrl };
