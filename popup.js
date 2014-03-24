function ge(e) {
  return document.getElementById(e);
}
function escapeHtml(text) {
  return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}

function reloadRules() {
  var rulesHTML = [];
  rules.forEach(function(rule, i) {
    rulesHTML.push('\
      <div id="rule' + i + '" class="rule collapsed">\
        <div id="rule' + i + '_short" class="rule_short">\
          <i id="rule' + i + '_icon" class="icon"></i><input id="rule' + i + '_enabled" type="checkbox" value="1"' + (rule.enabled ? ' checked' : '') + '/><span id="rule' + i + '_title" class="name">' + (rule.name ? rule.name : '<span style="color: #888">&lt;безымянное правило&gt;</span>') + '</span><input id="rule' + i + '_name" class="name_input" type="text" placeholder="Название правила" value="' + escapeHtml(rule.name) + '"/><a id="rule' + i + '_delete" class="delete" href="about:blank">✖</a>\
        </div>\
        <div class="rule_details">\
          <div class="row"><span>Шаблон:</span>\
            <input id="rule' + i + '_template" type="text" placeholder="Например, «Grand Theft Auto, GTA, &quot;GTA V&quot;»" value="' + escapeHtml(rule.template) + '"/>\
          </div>\
          <div class="row"><span><a href="http://ru.wikipedia.org/wiki/%D0%A0%D0%B5%D0%B3%D1%83%D0%BB%D1%8F%D1%80%D0%BD%D1%8B%D0%B5_%D0%B2%D1%8B%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F" target="_blank">RegExp</a>:</span>\
            <input id="rule' + i + '_regexp" type="checkbox" value="1"' + (rule.regexp ? ' checked' : '') + '/>\
          </div>\
          <div class="row"><span>Посты:</span>\
            <label><input type="radio" id="rule' + i + '_posts_0" name="rule' + i + '_posts" value="0"' + (rule.posts == 0 ? ' checked' : '') + '/>показывать</label>\
            <label><input type="radio" id="rule' + i + '_posts_1" name="rule' + i + '_posts" value="1"' + (rule.posts == 1 ? ' checked' : '') + '/>скрывать</label>\
            <label><input type="radio" id="rule' + i + '_posts_2" name="rule' + i + '_posts" value="2"' + (rule.posts == 2 ? ' checked' : '') + '/>удалять полностью</label>\
          </div>\
          <div class="row"><span>Комментарии:</span>\
            <label><input type="radio" id="rule' + i + '_comments_0" name="rule' + i + '_comments" value="0"' + (rule.comments == 0 ? ' checked' : '') + '/>показывать</label>\
            <label><input type="radio" id="rule' + i + '_comments_1" name="rule' + i + '_comments" value="1"' + (rule.comments == 1 ? ' checked' : '') + '/>скрывать</label>\
            <label><input type="radio" id="rule' + i + '_comments_2" name="rule' + i + '_comments" value="2"' + (rule.comments == 2 ? ' checked' : '') + '/>удалять</label>\
          </div>\
        </div>\
      </div>');
  });
  ge('rules').innerHTML = rules.length > 0 ? rulesHTML.join('') : '<div id="no_rules">Ни одного правила ещё не добавлено</div>';

  rules.forEach(function(rule, i) {
    ge('rule' + i + '_short').onclick = function() {
      ge('rule' + i).className = (ge('rule' + i).className == 'rule') ? 'rule collapsed' : 'rule';
    }

    ge('rule' + i + '_enabled').onchange = function() {
      rule.enabled = !!this.checked;
      saveRules();
    }

    ge('rule' + i + '_enabled').onclick = function(e) {
      e.stopPropagation();
    }

    ge('rule' + i + '_title').onclick = function(e) {
      this.style.display = 'none';
      ge('rule' + i + '_name').style.display = 'inline-block';
      ge('rule' + i + '_name').focus();
      if (e) {
        e.stopPropagation();
      }
    }

    ge('rule' + i + '_name').onblur = function() {
      this.style.display = 'none';
      ge('rule' + i + '_title').style.display = 'inline-block';
    }

    ge('rule' + i + '_name').onchange = function() {
      rule.name = this.value;
      ge('rule' + i + '_title').innerHTML = (rule.name ? rule.name : '<span style="color: #888">&lt;безымянное правило&gt;</span>');
      saveRules();
    }

    ge('rule' + i + '_name').onkeydown = function(e) {
      if (e.which == 13) {
        this.onchange();
        this.blur();
      } else
      if (e.which == 27) {
        this.value = rule.name;
        this.blur();
        return false;
      }
    }

    ge('rule' + i + '_delete').onclick = function(e) {
      rules.splice(i, 1);
      saveRules();
      reloadRules();
      e.stopPropagation();
      return false;
    }

    ge('rule' + i + '_template').onchange = ge('rule' + i + '_template').onblur = function() {
      rule.template = this.value;
      saveRules();
    }

    ge('rule' + i + '_template').onkeydown = function(e) {
      if (e.which == 13) {
        this.onchange();
        this.blur();
      } else
      if (e.which == 27) {
        this.value = rule.template;
        this.blur();
        return false;
      }
    }

    ge('rule' + i + '_regexp').onchange = function() {
      rule.regexp = !!this.checked;
      saveRules();
    }

    for (var j = 0; j <= 2; j++) {
      (function(j) {
        ge('rule' + i + '_posts_' + j).onclick = function() {
          rule.posts = j;
          saveRules();
        }

        ge('rule' + i + '_comments_' + j).onclick = function() {
          rule.comments = j;
          saveRules();
        }
      })(j);
    }
  });
}

function saveRules() {
  localStorage['rules'] = JSON.stringify(rules);
}


var rules = [];
try {
  rules = JSON.parse(localStorage['rules'] || '[]') || [];
} catch (e) {}
reloadRules();

ge('add_rule').onclick = function() {
  rules.push({
    name: '',
    enabled: true,
    template: '',
    regexp: false,
    posts: 1,
    comments: 1
  });
  reloadRules();
  ge('rule' + (rules.length - 1) + '_short').onclick();
  ge('rule' + (rules.length - 1) + '_title').onclick();
  return false;
}