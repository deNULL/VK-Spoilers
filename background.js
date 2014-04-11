chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (tab.url.indexOf('://vk.com/') > -1) {
    chrome.pageAction.show(tabId);
  }
});
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (request.method == "getConfig") {
    var rules = [];
    var config = {};
    try {
      rules = JSON.parse(localStorage['rules'] || '[]') || [];
      config = JSON.parse(localStorage['config'] || '{}') || {};
    } catch (e) {}

    var opened = {};
    try {
      opened = JSON.parse(localStorage['opened'] || '{}') || {};
    } catch (e) {}

    sendResponse({ rules: rules, opened: opened, config: config });
  } else
  if (request.method == "setOpened") {
    var opened = {};
    try {
      opened = JSON.parse(localStorage['opened'] || '{}') || {};
    } catch (e) {}

    opened[request.id] = opened[request.id] | request.state;
    localStorage['opened'] = JSON.stringify(opened);
  }
});