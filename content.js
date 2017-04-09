// Content scripts run in isolated world, we don't have access to any libraries

function ge(e) {
  return document.getElementById(e);
}
function isObject(o) {
  return o != null && typeof(o) == "object";
}
function geByClass(c, n) {
  return Array.prototype.slice.call((n || document).getElementsByClassName(c));
}
function geByClass1(c, n) {
  return (n || document).getElementsByClassName(c)[0];
}
function getRegexp(rule) {
  if (!rule.compiled) {
    rule.compiled = new RegExp(rule.template);
  }

  return rule.compiled;
}
function getKeywords(rule) {
  if (!rule.compiled) {
    rule.compiled = [];
    var phrase = [];
    var keyword = { exact: false, text: '' };
    for (var i = 0; i < rule.template.length; i++) {
      var ch = rule.template.charAt(i);
      if (!keyword.exact && ch == ',') { // start of new phrase
        if (keyword.text.trim()) {
          phrase.push(keyword);
        }
        if (phrase.length) {
          rule.compiled.push(phrase);
        }

        phrase = [];
        keyword = { exact: false, text: '' };
      } else
      if (ch == '"' || (!keyword.exact && ch == ' ')) { // start of new keyword
        if (keyword.text.trim()) {
          phrase.push(keyword);
        }

        keyword = { exact: (ch == '"') && !keyword.exact, text: '' };
      } else {
        keyword.text += keyword.exact ? ch : ch.toLocaleLowerCase();
      }
    }
    if (keyword.text.trim()) {
      phrase.push(keyword);
    }
    if (phrase.length) {
      rule.compiled.push(phrase);
    }
  }

  return rule.compiled;
}
function update(list) {
  list = list || ge('page_wall_posts') || ge('feed_rows') || ge('results') || document.body;

  var oldBlocked = blocked;
  geByClass('post', list).forEach(function(post) {
    if (post.processed || opened[post.id] == 3) {
      return;
    }

    if (geByClass('wall_marked_as_ads', post).length > 0){
      post.style.display = 'none';
      post.processed = true;
      console.log('blocked!', post);
      blocked++;
      return;
    }
    var isCommunityPost = post.id && (post.id.substr(0, 5) == 'post-');

    var hideBody = 0;
    var hideComments = 0;
    var hideRepost = 0;

    var appliedRules = [];
    var appliedRulesPars = [];

    var postText = geByClass('wall_post_text', post);
    postText.forEach(function(text) {
      var str = text.innerText;
      var strLow = str.toLocaleLowerCase();
      rules.forEach(function(rule) {
        if (rule.enabled) {
          var apply = false;
          if (rule.regexp) {
            apply = !!str.match(getRegexp(rule));
          } else {
            var keywords = getKeywords(rule);

            keywords.forEach(function(phrase) {
              var found = true;
              phrase.forEach(function(keyword) {
                if ((keyword.exact ? str : strLow).indexOf(keyword.text) == -1) {
                  found = false;
                }
              });

              if (found) {
                apply = true;
              }
            });
          }

          if (apply) {
            hideBody = Math.max(hideBody, rule.posts);
            hideComments = Math.max(hideComments, rule.comments);
            if (rule.name && appliedRules.indexOf('<b>' + rule.name + '</b>') == -1) {
              appliedRules.push('<b>' + rule.name + '</b>');
            }
			      appliedRulesPars.push(rule);
          }
        }
      });
    });
    
    var repostsPolicy = (config || {})[isCommunityPost ? 'repostsPub' : 'reposts'] || {};

    // hide reposts config
    var scanWallForReposts = repostsPolicy.scan_wall || false;
    var scanFeedForReposts = repostsPolicy.scan_feed || false;
    var scanRepostsEnabled = repostsPolicy.enabled || false;
    var hideRepost = false;

    // hide reposts
    if (scanRepostsEnabled) {
      if ((scanWallForReposts && isObject(ge('page_wall_posts' ))) ||
          (scanFeedForReposts && (isObject(ge('feed_rows')) || isObject(ge('results'))))) {
        var isRepost = post.classList.contains('post_copy');
        var isRepostWithText = false;

        if (!isRepost) {
          repostText = geByClass('published_by_wrap', post);
          repostText.forEach(function(text) {
            isRepost = true;
          });
        }

        // reposts as quote
        var repostText = geByClass('published_comment', post);
        repostText.forEach(function(text) {
          isRepostWithText = true;
        });
        if (!isRepostWithText) {
          repostText = geByClass('published_by_quote', post);
          repostText.forEach(function(text) {
            isRepostWithText = true;
          });
        }

        if (isRepost && (!isRepostWithText || !repostsPolicy.allow_quote)) {
          hideBody = repostsPolicy.posts;
          hideComments = repostsPolicy.comments;
          hideRepost = true;
  		  appliedRulesPars.push(repostsPolicy);
        }
      }
    }

  	post.save_mode = 0;
  	appliedRulesPars.forEach(function(rule){
  		if(rule.save == 1) post.save_mode = 1;
  	});

  	if ((opened[post.id] & 1) != 0) {
      hideBody = 0;
    }
    if ((opened[post.id] & 2) != 0) {
      hideComments = 0;
    }

    var appliedRulesText = appliedRules.length > 0 ? (appliedRules.length > 1 ? ' (правила ' : ' (правило ') + appliedRules.join(', ') + ')' : '';
    if (hideRepost)
      appliedRulesText = ' (<b>репост</b>)';

    var postBody = geByClass1('wall_text', post);
    var postComments = geByClass1('replies_wrap', post);

    if (hideBody == 2) { // totally remove post
      post.style.display = 'none';
      post.processed = true;
      console.log('blocked!', post);
      blocked++;
      return;
    }

    if (hideBody) {
      var old = {};
      for (var i = postBody.children.length - 1; i >= 1; i--) {
        old[i] = postBody.children[i];
        postBody.removeChild(postBody.children[i]);
        //old[i] = postBody.children[i].style.display;
        //postBody.children[i].style.display = 'none';
      }
      var bodySpoiler = document.createElement('DIV');
      bodySpoiler.innerHTML = '<a class="wr_header"><div class="wrh_text">Запись скрыта' + appliedRulesText + '</div></a>';
      postBody.appendChild(bodySpoiler);

      //var bodySpoiler = postBody.children[1];
      bodySpoiler.onclick = function() {
        for (var i = 1; isObject(old[i]); i++) {
          postBody.appendChild(old[i]);
        }
        var state = 1;
        if (hideComments == 1 && postComments) {
          postComments.style.display = 'block';
          state = 3;
        }
        bodySpoiler.style.display = 'none';

		    if (post.save_mode == 1) {
       		opened[post.id] = opened[post.id] | state;
        	chrome.extension.sendRequest({method: 'setOpened', id: post.id, state: state});
		    }
      }
      console.log('blocked!', post);
      blocked++;
    }

    if (hideComments && postComments) {
      postComments.style.display = 'none';

      if (!hideBody && hideComments != 2) {
        postComments.insertAdjacentHTML('beforebegin', '<a class="wr_header"><div class="wrh_text">Комментарии скрыты' + appliedRulesText + '</div></a>');
        var commentsSpoiler = postComments.previousElementSibling;
        commentsSpoiler.onclick = function() {
          commentsSpoiler.style.display = 'none';
          postComments.style.display = 'block';

    		  if(post.save_mode == 1) {
          	opened[post.id] = opened[post.id] | 2;
            chrome.extension.sendRequest({method: 'setOpened', id: post.id, state: 2});
    		  }
        }
      }
    }

    post.processed = true;
  });

  if (blocked != oldBlocked) {
    chrome.extension.sendRequest({ method: 'setCounter', count: blocked });
  }

  setTimeout(function() {
    checkLocation();
  }, 5);
}

function updateLastRead() {
  var list = ge('page_wall_posts') || ge('feed_rows') || ge('results') || document.body;

  geByClass('post', list).forEach(function(post) {
    var tm = geByClass('rel_date', post);
    if (tm && tm[0]) {
      var time = parseInt(tm[0].getAttribute('time'), 10);
      var rect = post.getBoundingClientRect();
      if (rect.top > 0) {
        config.lastread = config.lastread || {};

        if (!config.lastread[section] || config.lastread[section].time < time) {
          config.lastread[section] = { time: time, id: post.id };
          console.log('Set last read to ', config.lastread[section]);
          chrome.extension.sendRequest({method: 'saveConfig', config: config });
        }
      }
    }
  });
}

function toggleComments(spoiler) {
  for (var i = 0; i < spoiler.parent.children.length; i++) {
    spoiler.parent.children[i].style.display = 'block';
  }
  spoiler.style.display = 'none';
}

function togglePost(spoiler) {
  for (var i = 1; i < spoiler.parent.children.length; i++) {
    spoiler.parent.children[i].style.display = 'block';
  }
  spoiler.style.display = 'none';
}

var scrollingTo = false;
var path = false;
var section = false;
function checkLocation() {
  if (!config.save_position) {
    section = false;
    return;
  }
  config.lastread = config.lastread || {};
  if (document.location.pathname != '/feed') {
    path = document.location.pathname;
    section = false;
    return;
  }
  if (path == document.location.pathname + document.location.search) {
    if (scrollingTo) {
      scrollToPost(scrollingTo);
    }
    return;
  }

  var m = document.location.search.match(/[&?]section=([a-z]+)/);
  section = (m && m[1]) || 'feed';
  if (section != 'recommended' && section != 'search' && section != 'comments' && section != 'updates' && section != 'notifications' && section != 'replies') {
    console.log('SECTION=', section);
    var last = config.lastread[section];
    console.log('LAST POST=', last);

    var list = ge('page_wall_posts') || ge('feed_rows') || ge('results') || document.body;
    var posts = geByClass('post', list);

    if (last && (new Date()).getTime() / 1000 - last.time < (60 * 60 * 24 * 3)) {
      // Hurr durr, do something
      scrollToPost(last);
    } else {
      // Yay, nothing to do!
      // Except saving the last one now.
      if (posts.length) {
        var tm = geByClass('rel_date', posts[0]);
        if (tm && tm[0]) {
          config.lastread[section] = { time: parseInt(tm[0].getAttribute('time'), 10), id: posts[0].id };
          console.log('Set last read to ', config.lastread[section]);
          chrome.extension.sendRequest({method: 'saveConfig', config: config });
        }
      }
    }
  }
  path = document.location.pathname + document.location.search;
}
function scrollToPost(targ) {
  var list = ge('page_wall_posts') || ge('feed_rows') || ge('results') || document.body;
  var prev = false;
  var found = false;
  var last = false;
  var pre = [];
  geByClass('post', list).forEach(function(post, index) {
    var tm = geByClass('rel_date', post);
    var time;
    if (tm && tm[0]) {
      time = parseInt(tm[0].getAttribute('time'), 10);
      last = time;
    }
    if (found) {
      return;
    }
    if (post.id == targ.id) {
      found = (index < 1) ? true : post;
      return;
    }
    if (time && time < targ.time) {
      found = (index < 1) ? true : (prev || true);
      return;
    }
    prev = post;
    if (!found) {
      pre.push(post);
    }
  });

  if (found) {
    if (found !== true) {
      function check() {
        found.scrollIntoView({ behavior: 'smooth' });
        if (!imagesCnt) {
          scrollingTo = false;
        }
      }
      // Wait for all images within pre to load
      var imagesCnt = 0;
      pre.forEach(function(post) {
        var images = post.getElementsByTagName('IMG');
        for (var i = 0; i < images.length; i++) {
          var img = images[i];
          if (!img.complete) {
            imagesCnt++;
            img.onload = function() {
              imagesCnt--;
              check();
            }
            img.onerror = function() {
              imagesCnt--;
              check();
            }
          }
        };
      });
      if (!imagesCnt) {
        setTimeout(check, 10);
      }
      found.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    scrollingTo = false;
  } else {
    if (last && last > targ.time) {
      scrollingTo = targ;
      var more = ge('show_more_link');
      more && more.click();
      window.scrollTo(0, document.body.scrollHeight);
    } else {
      scrollingTo = false;
    }
  }
}

var rules = [];
var opened = {};
var blocked = 0;
chrome.extension.sendRequest({method: 'getConfig'}, function(response) {
  rules = response.rules;
  config = response.config;
  opened = response.opened;
  if (config.menu_type == 1) {
    document.querySelector('#l_nwsf > a').setAttribute('href', '/feed?section=friends');
  } else
  if (config.menu_type == 2) {
    var item = document.createElement('li');
    item.innerHTML = '<a href="/feed" onclick="return nav.go(this, event, {noback: true, params: {_ref: \'left_nav\'}});" class="left_row">' +
      '<span class="left_fixer">' +
        '<span class="left_count_wrap  left_void fl_r"><span class="inl_bl left_plus">+</span></span>' +
        '<span class="left_label inl_bl">Моя Лента</span>' +
      '</span></a>';
    var nwsf = ge('l_nwsf');
    nwsf.parentNode.insertBefore(item, nwsf.nextSibling);
    document.querySelector('#l_nwsf > a').setAttribute('href', '/feed?section=friends');
  } else
  if (config.menu_type == 3) {
    var item = document.createElement('li');
    item.innerHTML = '<a href="/feed?section=groups" onclick="return nav.go(this, event, {noback: true, params: {_ref: \'left_nav\'}});" class="left_row">' +
      '<span class="left_fixer">' +
        '<span class="left_count_wrap  left_void fl_r"><span class="inl_bl left_plus">+</span></span>' +
        '<span class="left_label inl_bl">Мои Сообщества</span>' +
      '</span></a>';
    var nwsf = ge('l_nwsf');
    nwsf.parentNode.insertBefore(item, nwsf.nextSibling);
    document.querySelector('#l_nwsf > a').setAttribute('href', '/feed?section=friends');
  }
  (new MutationObserver(function(mutations, observer) {
    mutations.forEach(function(mutation) {
      if (mutation.target.id == 'wrap3' || mutation.target.id == 'profile_wide' || mutation.target.id == 'results_wrap') {
        blocked = 0;
        chrome.extension.sendRequest({ method: 'setCounter', count: blocked });
        update();
      } else if (mutation.target.id == 'page_wall_posts' || mutation.target.id == 'feed_rows' || mutation.target.id.indexOf('feed_row') === 0) {
        update(mutation.target);
      }
    });
  })).observe(ge('page_body'), {
    childList: true,
    subtree: true
  });
  update();
  window.onscroll = function() {
    if (section && !scrollingTo) {
      // Get first visible element, store it
      updateLastRead();
    }
  }
});

