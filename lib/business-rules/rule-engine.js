var BusinessRules = BusinessRules || {};

(function() {
  var standardOperators = {
    present: function(actual, target) {
      return !!actual;
    },
    blank: function(actual, target) {
      return !actual;
    },
    equalTo: function(actual, target) {
      return "" + actual === "" + target;
    },
    notEqualTo: function(actual, target) {
      return "" + actual !== "" + target;
    },
    greaterThan: function(actual, target) {
      return parseFloat(actual, 10) > parseFloat(target, 10);
    },
    greaterThanEqual: function(actual, target) {
      return parseFloat(actual, 10) >= parseFloat(target, 10);
    },
    lessThan: function(actual, target) {
      return parseFloat(actual, 10) < parseFloat(target, 10);
    },
    lessThanEqual: function(actual, target) {
      return parseFloat(actual, 10) <= parseFloat(target, 10);
    },
    includes: function(actual, target) {
      return ("" + actual).indexOf("" + target) > -1;
    },
    matchesRegex: function(actual, target) {
      var r = target.replace(/^\/|\/$/g, "");
      var regex = new RegExp(r);
      return regex.test("" + actual);
    }
  };

  var RuleEngine = BusinessRules.RuleEngine = function RuleEngine(rule) {
    rule = rule || {};
    this.operators = {};
    this.actions = rule.actions || [];
    this.conditions = rule.conditions || {all: []};
  }

  RuleEngine.prototype = {
    run: function(conditionsAdapter, actionsAdapter) {
      if(this.matches(conditionsAdapter)) {
        this.runActions(actionsAdapter);
      }
    },

    matches: function(conditionsAdapter) {
      return handleNode(this.conditions, conditionsAdapter, this);
    },

    operator: function(name) {
      return this.operators[name] || standardOperators[name];
    },

    addOperators: function(newOperators) {
      for(var key in newOperators) {
        if(newOperators.hasOwnProperty(key)) {
          this.operators[key] = newOperators[key];
        }
      }
    },

    runActions: function(actionsAdapter) {
      for(var i=0; i < this.actions.length; i++) {
        var actionData = this.actions[i];
        var actionName = actionData.value;
        var actionFunction = actionsAdapter[actionName]
        if(actionFunction) { actionFunction(new Finder(actionData)); }
      }
    }
  };

  function Finder(data) {
    this.data = data;
  }

  Finder.prototype = {
    find: function() {
      var currentNode = this.data;
      for(var i=0; i < arguments.length; i++) {
        var name = arguments[i];
        currentNode = findByName(name, currentNode);
        if(!currentNode) { return null; }
      }
      return currentNode.value;
    }
  };

  function findByName(name, node) {
    var fields = node.fields || [];
    for(var i=0; i < fields.length; i++) {
      var field = fields[i];
      if(field.name === name) { return field; }
    }
    return null;
  }

  function handleNode(node, obj, engine) {
    if(node.all || node.any) {
      return handleConditionalNode(node, obj, engine);
    } else {
      return handleRuleNode(node, obj, engine);
    }
  }

  function handleConditionalNode(node, obj, engine) {
    var isAll = !!(node.all);
    var nodes = isAll ? node.all : node.any;
    for(var i=0; i < nodes.length; i++) {
      var result = handleNode(nodes[i], obj, engine);
      if(isAll && !result) { return false; }
      if(!isAll && !!result) { return true; }
    }
    return isAll;
  }

  function handleRuleNode(node, obj, engine) {
    var value = obj[node.name];
    if(value && value.call) {value = value()}
    return compareValues(value, node.operator, node.value, engine);
  }

  function compareValues(actual, operator, value, engine) {
    var operatorFunction = engine.operator(operator);
    return operatorFunction && operatorFunction(actual, value);
  }

})();
