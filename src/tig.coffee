###!
Tig: A novel way to template
BSD Licensed
###

$ = jQuery

###
These are the public jQuery methods
###
$.fn.extend({
  # See: parse()
  tig: (data, options) ->
    parse(this, data, options)
    return this
})
$.extend({
  # See: register()
  tigRegister: (item, weight) ->
    register(item, weight)
    return this
  # See: constants
  tigConstants: () ->
    return constants
})

###
Constants used in this application
###
constants =
  PREPROCESSING_COMPLETE: -100
  PROCESSING_BEGIN:       0
  HTML_COMPLIANCE:        100
  TIG_DEFINE:             200
  TIG_CONDITION:          300
  TIG_REPEAT:             400
  TIG_CONTENT:            500
  TIG_REPLACE:            600
  TIG_ATTRIBUTES:         700
  TIG_OMIT:               800
  TIG_BLOCK:              900
  TIG_CLEANUP:            1000
  PROCESSING_COMPLETE:    1100

###
Registered and sorted components
###
tigs = []
sortedTigs = []
sortedTigsIsDirty = true

###
Resolve a key string collection
Method:     tigResolve
Arguments:  keyString - a string to search once converted to dotted.object
            data - an object literal to scan
            defaultsTo - the default when object is not found
###
tigResolve = (keyString, data, defaultsTo = null) ->
  keyPieces = keyString.split("/")
  path = data
  failed = false
  for key in keyPieces
    if path[key]?
      path = path[key]
    else
      failed = true
      break
  if failed
    return defaultsTo
  else
    return path

###
A Method used for sorting the Tigs collection
Method:     sortTigs
Arguments:  (none)
###
sortTigs = () ->
  weights = {}
  weightSort = []
  weightSortHash = {}
  
  # group tigs together by weight
  for tigItem in tigs
    if !weights[tigItem.weight]? then weights[tigItem.weight] = []
    weights[tigItem.weight].push tigItem
    
    if !weightSortHash[tigItem.weight]?
      weightSortHash[tigItem.weight] = true
      weightSort.push tigItem.weight
  
  # sort weights numerically ascending
  weightSort.sort (a, b) ->
    return a - b
  
  # by weight, push all tigs onto sorted stack
  for weight in weightSort
    for tigItem in weights[weight]
      sortedTigs.push tigItem.item
  
  # mark clean
  sortedTigsIsDirty = false

###
The main parsing method. This runs through all tigs found.
Method:     parse
Arguments:  node - the node being manipulated
            data - the object literal containing the data to bind to the template
            options - an object literal of options that can be invoked
###
parse = (node, data, options) ->
  if sortedTigsIsDirty then sortTigs()
  
  tigNodeBucket = {}
  
  tigEvaluator = new TigEvaluator(data)
  
  # for each tig, extract, search, and go
  for tigItem in sortedTigs
    $(tigItem.searchString(), node).each () ->
      tigItem.onMatch($(this), tigEvaluator)
    
###
Register a tig item into the system at the specified weight. Useful
for adding and extending functionality
Method:     register
Arguments:  item - the object to register. Is an uninstantiated object
            weight - a numerical weight to order it in the parsing
###
register = (item, weight) ->
  tigs.push {
    item: new item(),
    weight: weight
  }

###
-------------------------------------------------------------------------------
###

###
TigEvaluator: Turns strings into meaningful references
###
class TigEvaluator
  constructor: (data) ->
    @data = data
    @localData = []
    @globalData = {}
    @resolveRegex = /#\{(.*?)\}/g
    @andRegex = /[\s+]and[\s+]/gi
    @orRegex = /[\s+]or[\s+]/gi
    @gteRegex = /[\s+]gte[\s+]/gi
    @lteRegex = /[\s+]lte[\s+]/gi
    @ltRegex = /[\s+]lt[\s+]/gi
    @gtRegex = /[\s+]gt[\s+]/gi
    @eqRegex = /[\s+]eq[\s+]/gi
    @exRegex = /[\s+]ex[\s+]/gi
    @structureRegex = /^structure[\s]+/i
    @textRegex = /^text[\s]+/i
    @storageAttr = "data-tig-working-localdata"
  store: (node, data) ->
    # node is null, set global
    if node == null
      $.extend(@globalData, data)
      return -1
    
    if $(node).attr(@storageAttr)?
      # if node already has data, merge to new
      index = $(item).attr(@storageAttr)
      merge = @localData[index] || {}
      data = $.extend(merge, data)
      @localData[index] = data
    else
      # new item
      index = @localData.length
      @localData.push data
      node.attr(@storageAttr, index)
    return index
  evaluate: (str, node, options = {}) ->
    $.extend({
      to: "null"
      structure: false
    }, options)
    
    # create localData
    mergedData = {}
    originalString = str
    
    # merge data and globals
    $.extend(mergedData, @data, @globalData)
    
    # check self for storage
    if $(node).attr(@storageAttr)?
      merge = @localData[$(node).attr(@storageAttr)] || {}
      $.extend(mergedData, merge)
    
    # check parents for storage
    $(node.parents("*[#{@storageAttr}]").get().reverse()).each (i, item) =>
      merge = @localData[$(item).attr(@storageAttr)] || {}
      $.extend(mergedData, merge)
    
    # check for structure or text
    isStructure = false
    if str?.indexOf('structure ') == 0 || options.structure
      isStructure = true
      str = str.replace(@structureRegex, '')

    else if str?.indexOf('text ') == 0
      str = str.replace(@textRegex, '')
    
    # replace the #{} with a function call to tigResolve(x, to)
    # replace " and " + " or " to their logical operators
    # replace " gt ", " lt ", " gte ", " lte ", " eq ", " ex " with symbols
    str = str.replace(@resolveRegex, "tigResolve('$1', mergedData, #{options.to})")
             .replace(@andRegex, " && ")
             .replace(@orRegex, " || ")
             .replace(@gteRegex, " >= ")
             .replace(@lteRegex, " <= ")
             .replace(@gtRegex, " > ")
             .replace(@ltRegex, " < ")
             .replace(@eqRegex, " == ")
             .replace(@exRegex, " === ")

    # take this new phrase and run it (oooh eval scary!)
    try
      result = eval(str)
    catch error
      throw new Error("Tig Syntax - the following expression is not valid: #{originalString} => #{str}")
    
    # escape if we need to
    if !isStructure and result
      result = $("<div/>").text(result).html()
    
    # return the return value
    return result
###
-------------------------------------------------------------------------------
###

###
Tig LocalData Cleaner
###
class TigLocalDataCleaner
  constructor: () ->
    @attr = "data-tig-working-localdata"
  searchString: () ->
    return "*[#{@attr}]"
  onMatch: (node, evaluator) ->
    node.removeAttr(@attr)
$.tigRegister(TigLocalDataCleaner, constants.TIG_CLEANUP)

###
TigDefine: Handles local definitions of items
###
class TigDefine
  constructor: () ->
    @attr = "data-tig-define"
    @splitRegex = /,/
    @phrases = /^[\s]*(.*?)[\s]*=[\s]*(.*)[\s]*$/
    @localRegex = /^local[\s]+/i
    @globalRegex = /^global[\s]+/i
  searchString: () ->
    return "*[#{@attr}]"
  onMatch: (node, evaluator) ->
    attr = node.attr(@attr)
    locals = {}
    globals = {}
    # split on ,
    pieces = attr.split(@splitRegex)
    # for each item
    # trim and look at indexOf to see if local or global
    # matches format A = B, A is name, B is tales value
    # store in local or global
    for piece in pieces
      piece = $.trim(piece)
      isLocal = false
      
      if piece.indexOf("local ") == 0
        isLocal = true
        piece = piece.replace(@localRegex, "")
      else if piece.indexOf("global ") == 0
        piece = piece.replace(@globalRegex, "")
      else
        # assume local
        isLocal = true
      
      fragments = piece.match(@phrases)
      name = fragments[1]
      value = evaluator.evaluate(fragments[2], node)
      
      if isLocal
        locals[name] = value
      else
        globals[name] = value
    
    # write local to node
    # write global to null node
    evaluator.store(node, locals)
    evaluator.store(null, globals)
    node.removeAttr(@attr)
    return true
$.tigRegister(TigDefine, constants.TIG_DEFINE)

###
TigContent: Handles content resolution and replaces into the node
###
class TigContent
  constructor: () ->
    @attr = "data-tig-content"
  searchString: () ->
    return "*[#{@attr}]"
  onMatch: (node, evaluator) ->
    attr = node.attr(@attr)
    node.removeAttr(@attr).html(evaluator.evaluate(attr, node))
$.tigRegister(TigContent, constants.TIG_CONTENT)

###
TigReplace: replaces the entire node with new content
###
class TigReplace
  constructor: () ->
    @attr = "data-tig-replace"
  searchString: () ->
    return "*[#{@attr}]"
  onMatch: (node, evaluator) ->
    attr = node.attr(@attr)
    node.before(evaluator.evaluate(attr, node))
    node.remove()
$.tigRegister(TigReplace, constants.TIG_REPLACE)

###
TigBlock: a null op. The block is removed, all content moves up one parent
###
class TigBlock
  constructor: () ->
    @attr = "data-tig-block"
  searchString: () ->
    return "*[#{@attr}]"
  onMatch: (node, evaluator) ->
    node.children.each () ->
      node.before(this)
    node.remove()
$.tigRegister(TigBlock, constants.TIG_BLOCK)

###
TigAttribute: Set an attribute to the provided evaluator syntax
###
class TigAttribute
  constructor: () ->
    @attr = "data-tig-attribute"
    @splitRegex = /,/
    @phrases = /^[\s]*(.*?)[\s]*(\+?=)[\s]*(.*)[\s]*$/
  searchString: () ->
    return "*[#{@attr}]"
  onMatch: (node, evaluator) ->
    attr = node.attr(@attr)
    # split on ","
    changes = attr.split(@splitRegex)
    for change in changes
      # attr modifier expression
      fragments = change.match(@phrases)
      targetAttr = $.trim(fragments[1])
      mode = fragments[2]
      result = evaluator.evaluate(fragments[3], node)
      initialAttr = node.attr(targetAttr)
      if mode == "+=" then result = initialAttr + result
      node.attr(targetAttr, result)
    node.removeAttr(@attr)
$.tigRegister(TigAttribute, constants.TIG_ATTRIBUTES)

###
TigCondition: Show the node if the condition evaluates truthy
###
class TigCondition
  constructor: () ->
    @attr = "data-tig-condition"
  searchString: () ->
    return "*[#{@attr}]"
  onMatch: (node, evaluator) ->
    result = evaluator.evaluate(node.attr(@attr), node)
    if !result then node.remove() else node.removeAttr(@attr)
$.tigRegister(TigCondition, constants.TIG_CONDITION)

###
TigOmit: Simply removes the tag
###
class TigOmit
  constructor: () ->
    @attr = "data-tig-omit"
  searchString: () ->
    return "*[#{@attr}]"
  onMatch: (node, evaluator) ->
    result = evaluator.evaluate(node.attr(@attr), node)
    if result
      node.remove()
    else 
      node.removeAttr(@attr)
$.tigRegister(TigOmit, constants.TIG_OMIT)

###
TigRepeat: Repeatable sections of a document
###
class TigRepeat
  constructor: () ->
    @attr = "data-tig-repeat"
    @phrases = /^[\s]*(.*?)[\s]*as[\s]*(.*)[\s]*$/
  searchString: () ->
    return "*[#{@attr}]"
  onMatch: (node, evaluator) ->
    # evaluate attr to a value
    attr = node.attr(@attr)
    fragments = attr.match(@phrases)
    result = evaluator.evaluate(fragments[1], node, {
      to: "[]"
      structure: true
    })
    loopName = fragments[2]

    # remove attr before cloning
    node.removeAttr(@attr)
    
    # for each item in the loop, clone node
    # set defines for the local item
    count = 0
    for item in result
      newNode = node.clone()
      # on newNode, add local variables
      payload = {}
      repeat =
        index: count
        number: count + 1
        even: (count % 2) != 0
        odd: (count % 2) == 0
        start: 0
        end: result.length - 1
        length: result.length
      payload.repeat[loopName] = repeat
      payload[loopName] = result[count]
      evaluator.store(newNode, payload)
      node.parent().append(newNode)
      count++
    # we now have a ton of things with local defines and the block has been repeated
    # remove the original templated node
    node.remove()
$.tigRegister(TigRepeat, constants.TIG_REPEAT)