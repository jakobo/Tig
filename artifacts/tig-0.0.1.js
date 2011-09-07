/*
Library: Tig
Homepage: https://github.com/jakobo/tig
License: MIT License
*/


/*
The MIT License

Copyright (c) 2008 Jakob Heuser <jakob@felocity.org>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function() {
  /*!
  Tig: A novel way to template
  BSD Licensed
  */  var $, TigAttribute, TigBlock, TigCondition, TigContent, TigDefine, TigEvaluator, TigLocalDataCleaner, TigOmit, TigRepeat, TigReplace, constants, parse, register, sortTigs, sortedTigs, sortedTigsIsDirty, tigResolve, tigs;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  $ = jQuery;
  /*
  These are the public jQuery methods
  */
  $.fn.extend({
    tig: function(data, options) {
      parse(this, data, options);
      return this;
    }
  });
  $.extend({
    tigRegister: function(item, weight) {
      register(item, weight);
      return this;
    },
    tigConstants: function() {
      return constants;
    }
  });
  /*
  Constants used in this application
  */
  constants = {
    PREPROCESSING_COMPLETE: -100,
    PROCESSING_BEGIN: 0,
    HTML_COMPLIANCE: 100,
    TIG_DEFINE: 200,
    TIG_CONDITION: 300,
    TIG_REPEAT: 400,
    TIG_CONTENT: 500,
    TIG_REPLACE: 600,
    TIG_ATTRIBUTES: 700,
    TIG_OMIT: 800,
    TIG_BLOCK: 900,
    TIG_CLEANUP: 1000,
    PROCESSING_COMPLETE: 1100
  };
  /*
  Registered and sorted components
  */
  tigs = [];
  sortedTigs = [];
  sortedTigsIsDirty = true;
  /*
  Resolve a key string collection
  Method:     tigResolve
  Arguments:  keyString - a string to search once converted to dotted.object
              data - an object literal to scan
              defaultsTo - the default when object is not found
  */
  tigResolve = function(keyString, data, defaultsTo) {
    var failed, key, keyPieces, path, _i, _len;
    if (defaultsTo == null) {
      defaultsTo = null;
    }
    keyPieces = keyString.split("/");
    path = data;
    failed = false;
    for (_i = 0, _len = keyPieces.length; _i < _len; _i++) {
      key = keyPieces[_i];
      if (path[key] != null) {
        path = path[key];
      } else {
        failed = true;
        break;
      }
    }
    if (failed) {
      return defaultsTo;
    } else {
      return path;
    }
  };
  /*
  A Method used for sorting the Tigs collection
  Method:     sortTigs
  Arguments:  (none)
  */
  sortTigs = function() {
    var tigItem, weight, weightSort, weightSortHash, weights, _i, _j, _k, _len, _len2, _len3, _ref;
    weights = {};
    weightSort = [];
    weightSortHash = {};
    for (_i = 0, _len = tigs.length; _i < _len; _i++) {
      tigItem = tigs[_i];
      if (!(weights[tigItem.weight] != null)) {
        weights[tigItem.weight] = [];
      }
      weights[tigItem.weight].push(tigItem);
      if (!(weightSortHash[tigItem.weight] != null)) {
        weightSortHash[tigItem.weight] = true;
        weightSort.push(tigItem.weight);
      }
    }
    weightSort.sort(function(a, b) {
      return a - b;
    });
    for (_j = 0, _len2 = weightSort.length; _j < _len2; _j++) {
      weight = weightSort[_j];
      _ref = weights[weight];
      for (_k = 0, _len3 = _ref.length; _k < _len3; _k++) {
        tigItem = _ref[_k];
        sortedTigs.push(tigItem.item);
      }
    }
    return sortedTigsIsDirty = false;
  };
  /*
  The main parsing method. This runs through all tigs found.
  Method:     parse
  Arguments:  node - the node being manipulated
              data - the object literal containing the data to bind to the template
              options - an object literal of options that can be invoked
  */
  parse = function(node, data, options) {
    var tigEvaluator, tigItem, tigNodeBucket, _i, _len, _results;
    if (sortedTigsIsDirty) {
      sortTigs();
    }
    tigNodeBucket = {};
    tigEvaluator = new TigEvaluator(data);
    _results = [];
    for (_i = 0, _len = sortedTigs.length; _i < _len; _i++) {
      tigItem = sortedTigs[_i];
      _results.push($(tigItem.searchString(), node).each(function() {
        return tigItem.onMatch($(this), tigEvaluator);
      }));
    }
    return _results;
  };
  /*
  Register a tig item into the system at the specified weight. Useful
  for adding and extending functionality
  Method:     register
  Arguments:  item - the object to register. Is an uninstantiated object
              weight - a numerical weight to order it in the parsing
  */
  register = function(item, weight) {
    return tigs.push({
      item: new item(),
      weight: weight
    });
  };
  /*
  -------------------------------------------------------------------------------
  */
  /*
  TigEvaluator: Turns strings into meaningful references
  */
  TigEvaluator = (function() {
    function TigEvaluator(data) {
      this.data = data;
      this.localData = [];
      this.globalData = {};
      this.resolveRegex = /#\{(.*?)\}/g;
      this.andRegex = /[\s+]and[\s+]/gi;
      this.orRegex = /[\s+]or[\s+]/gi;
      this.gteRegex = /[\s+]gte[\s+]/gi;
      this.lteRegex = /[\s+]lte[\s+]/gi;
      this.ltRegex = /[\s+]lt[\s+]/gi;
      this.gtRegex = /[\s+]gt[\s+]/gi;
      this.eqRegex = /[\s+]eq[\s+]/gi;
      this.exRegex = /[\s+]ex[\s+]/gi;
      this.structureRegex = /^structure[\s]+/i;
      this.textRegex = /^text[\s]+/i;
      this.storageAttr = "data-tig-working-localdata";
    }
    TigEvaluator.prototype.store = function(node, data) {
      var index, merge;
      if (node === null) {
        $.extend(this.globalData, data);
        return -1;
      }
      if ($(node).attr(this.storageAttr) != null) {
        index = $(item).attr(this.storageAttr);
        merge = this.localData[index] || {};
        data = $.extend(merge, data);
        this.localData[index] = data;
      } else {
        index = this.localData.length;
        this.localData.push(data);
        node.attr(this.storageAttr, index);
      }
      return index;
    };
    TigEvaluator.prototype.evaluate = function(str, node, options) {
      var isStructure, merge, mergedData, originalString, result;
      if (options == null) {
        options = {};
      }
      $.extend({
        to: "null",
        structure: false
      }, options);
      mergedData = {};
      originalString = str;
      $.extend(mergedData, this.data, this.globalData);
      if ($(node).attr(this.storageAttr) != null) {
        merge = this.localData[$(node).attr(this.storageAttr)] || {};
        $.extend(mergedData, merge);
      }
      $(node.parents("*[" + this.storageAttr + "]").get().reverse()).each(__bind(function(i, item) {
        merge = this.localData[$(item).attr(this.storageAttr)] || {};
        return $.extend(mergedData, merge);
      }, this));
      isStructure = false;
      if ((str != null ? str.indexOf('structure ') : void 0) === 0 || options.structure) {
        isStructure = true;
        str = str.replace(this.structureRegex, '');
      } else if ((str != null ? str.indexOf('text ') : void 0) === 0) {
        str = str.replace(this.textRegex, '');
      }
      str = str.replace(this.resolveRegex, "tigResolve('$1', mergedData, " + options.to + ")").replace(this.andRegex, " && ").replace(this.orRegex, " || ").replace(this.gteRegex, " >= ").replace(this.lteRegex, " <= ").replace(this.gtRegex, " > ").replace(this.ltRegex, " < ").replace(this.eqRegex, " == ").replace(this.exRegex, " === ");
      try {
        result = eval(str);
      } catch (error) {
        throw new Error("Tig Syntax - the following expression is not valid: " + originalString + " => " + str);
      }
      if (!isStructure && result) {
        result = $("<div/>").text(result).html();
      }
      return result;
    };
    return TigEvaluator;
  })();
  /*
  -------------------------------------------------------------------------------
  */
  /*
  Tig LocalData Cleaner
  */
  TigLocalDataCleaner = (function() {
    function TigLocalDataCleaner() {
      this.attr = "data-tig-working-localdata";
    }
    TigLocalDataCleaner.prototype.searchString = function() {
      return "*[" + this.attr + "]";
    };
    TigLocalDataCleaner.prototype.onMatch = function(node, evaluator) {
      return node.removeAttr(this.attr);
    };
    return TigLocalDataCleaner;
  })();
  $.tigRegister(TigLocalDataCleaner, constants.TIG_CLEANUP);
  /*
  TigDefine: Handles local definitions of items
  */
  TigDefine = (function() {
    function TigDefine() {
      this.attr = "data-tig-define";
      this.splitRegex = /,/;
      this.phrases = /^[\s]*(.*?)[\s]*=[\s]*(.*)[\s]*$/;
      this.localRegex = /^local[\s]+/i;
      this.globalRegex = /^global[\s]+/i;
    }
    TigDefine.prototype.searchString = function() {
      return "*[" + this.attr + "]";
    };
    TigDefine.prototype.onMatch = function(node, evaluator) {
      var attr, fragments, globals, isLocal, locals, name, piece, pieces, value, _i, _len;
      attr = node.attr(this.attr);
      locals = {};
      globals = {};
      pieces = attr.split(this.splitRegex);
      for (_i = 0, _len = pieces.length; _i < _len; _i++) {
        piece = pieces[_i];
        piece = $.trim(piece);
        isLocal = false;
        if (piece.indexOf("local ") === 0) {
          isLocal = true;
          piece = piece.replace(this.localRegex, "");
        } else if (piece.indexOf("global ") === 0) {
          piece = piece.replace(this.globalRegex, "");
        } else {
          isLocal = true;
        }
        fragments = piece.match(this.phrases);
        name = fragments[1];
        value = evaluator.evaluate(fragments[2], node);
        if (isLocal) {
          locals[name] = value;
        } else {
          globals[name] = value;
        }
      }
      evaluator.store(node, locals);
      evaluator.store(null, globals);
      node.removeAttr(this.attr);
      return true;
    };
    return TigDefine;
  })();
  $.tigRegister(TigDefine, constants.TIG_DEFINE);
  /*
  TigContent: Handles content resolution and replaces into the node
  */
  TigContent = (function() {
    function TigContent() {
      this.attr = "data-tig-content";
    }
    TigContent.prototype.searchString = function() {
      return "*[" + this.attr + "]";
    };
    TigContent.prototype.onMatch = function(node, evaluator) {
      var attr;
      attr = node.attr(this.attr);
      return node.removeAttr(this.attr).html(evaluator.evaluate(attr, node));
    };
    return TigContent;
  })();
  $.tigRegister(TigContent, constants.TIG_CONTENT);
  /*
  TigReplace: replaces the entire node with new content
  */
  TigReplace = (function() {
    function TigReplace() {
      this.attr = "data-tig-replace";
    }
    TigReplace.prototype.searchString = function() {
      return "*[" + this.attr + "]";
    };
    TigReplace.prototype.onMatch = function(node, evaluator) {
      var attr;
      attr = node.attr(this.attr);
      node.before(evaluator.evaluate(attr, node));
      return node.remove();
    };
    return TigReplace;
  })();
  $.tigRegister(TigReplace, constants.TIG_REPLACE);
  /*
  TigBlock: a null op. The block is removed, all content moves up one parent
  */
  TigBlock = (function() {
    function TigBlock() {
      this.attr = "data-tig-block";
    }
    TigBlock.prototype.searchString = function() {
      return "*[" + this.attr + "]";
    };
    TigBlock.prototype.onMatch = function(node, evaluator) {
      node.children.each(function() {
        return node.before(this);
      });
      return node.remove();
    };
    return TigBlock;
  })();
  $.tigRegister(TigBlock, constants.TIG_BLOCK);
  /*
  TigAttribute: Set an attribute to the provided evaluator syntax
  */
  TigAttribute = (function() {
    function TigAttribute() {
      this.attr = "data-tig-attribute";
      this.splitRegex = /,/;
      this.phrases = /^[\s]*(.*?)[\s]*(\+?=)[\s]*(.*)[\s]*$/;
    }
    TigAttribute.prototype.searchString = function() {
      return "*[" + this.attr + "]";
    };
    TigAttribute.prototype.onMatch = function(node, evaluator) {
      var attr, change, changes, fragments, initialAttr, mode, result, targetAttr, _i, _len;
      attr = node.attr(this.attr);
      changes = attr.split(this.splitRegex);
      for (_i = 0, _len = changes.length; _i < _len; _i++) {
        change = changes[_i];
        fragments = change.match(this.phrases);
        targetAttr = $.trim(fragments[1]);
        mode = fragments[2];
        result = evaluator.evaluate(fragments[3], node);
        initialAttr = node.attr(targetAttr);
        if (mode === "+=") {
          result = initialAttr + result;
        }
        node.attr(targetAttr, result);
      }
      return node.removeAttr(this.attr);
    };
    return TigAttribute;
  })();
  $.tigRegister(TigAttribute, constants.TIG_ATTRIBUTES);
  /*
  TigCondition: Show the node if the condition evaluates truthy
  */
  TigCondition = (function() {
    function TigCondition() {
      this.attr = "data-tig-condition";
    }
    TigCondition.prototype.searchString = function() {
      return "*[" + this.attr + "]";
    };
    TigCondition.prototype.onMatch = function(node, evaluator) {
      var result;
      result = evaluator.evaluate(node.attr(this.attr), node);
      if (!result) {
        return node.remove();
      } else {
        return node.removeAttr(this.attr);
      }
    };
    return TigCondition;
  })();
  $.tigRegister(TigCondition, constants.TIG_CONDITION);
  /*
  TigOmit: Simply removes the tag
  */
  TigOmit = (function() {
    function TigOmit() {
      this.attr = "data-tig-omit";
    }
    TigOmit.prototype.searchString = function() {
      return "*[" + this.attr + "]";
    };
    TigOmit.prototype.onMatch = function(node, evaluator) {
      var result;
      result = evaluator.evaluate(node.attr(this.attr), node);
      if (result) {
        return node.remove();
      } else {
        return node.removeAttr(this.attr);
      }
    };
    return TigOmit;
  })();
  $.tigRegister(TigOmit, constants.TIG_OMIT);
  /*
  TigRepeat: Repeatable sections of a document
  */
  TigRepeat = (function() {
    function TigRepeat() {
      this.attr = "data-tig-repeat";
      this.phrases = /^[\s]*(.*?)[\s]*as[\s]*(.*)[\s]*$/;
    }
    TigRepeat.prototype.searchString = function() {
      return "*[" + this.attr + "]";
    };
    TigRepeat.prototype.onMatch = function(node, evaluator) {
      var attr, count, fragments, item, loopName, newNode, payload, repeat, result, _i, _len;
      attr = node.attr(this.attr);
      fragments = attr.match(this.phrases);
      result = evaluator.evaluate(fragments[1], node, {
        to: "[]",
        structure: true
      });
      loopName = fragments[2];
      node.removeAttr(this.attr);
      count = 0;
      for (_i = 0, _len = result.length; _i < _len; _i++) {
        item = result[_i];
        newNode = node.clone();
        payload = {};
        repeat = {
          index: count,
          number: count + 1,
          even: (count % 2) !== 0,
          odd: (count % 2) === 0,
          start: 0,
          end: result.length - 1,
          length: result.length
        };
        payload.repeat[loopName] = repeat;
        payload[loopName] = result[count];
        evaluator.store(newNode, payload);
        node.parent().append(newNode);
        count++;
      }
      return node.remove();
    };
    return TigRepeat;
  })();
  $.tigRegister(TigRepeat, constants.TIG_REPEAT);
}).call(this);
