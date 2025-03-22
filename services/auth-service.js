export async function getAuthToken() {
    return new Promise(resolve => {
        chrome.storage.local.get(["authToken"], result => {
            resolve(result.authToken || null);
        });
    });
}

export async function logout() {
    return new Promise(resolve => {
        chrome.storage.local.remove("authToken", () => {
            resolve();
        });
    });
}