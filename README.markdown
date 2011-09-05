Tig: A template in your HTML, sans <, {, {{, etc
===
It's much easier to build a page in HTML first, and then fuse dynamic data to it. That's the philosophy behind Tig- build your page, annotate it, and then add the data.

Quick Start
---
```
$(document).ready(function() {
  $(document.body).tig({
    user: {
      name: "John Doe",
      looped: [
        { foo: "one" },
        { foo: "two" },
        { foo: "three" }
      ]
    }
  });
});
```

And your markup...

```
<p data-tig-content="#{user/name} or ''">Fred Farkas</p>
<p data-tig-content="#{user/idea} or 'none'">Brilliant</p>

<a href="#" class="one" data-tig-attribute="href = 'http://www.google.com', class += ' two'">attr changes</a>

<div data-tig-condition="#{user/tested} or (#{user/otherTested} and #{user/otherTestedB})">tested</div>
<div data-tig-omit="true">I get dropped<p>and me</p></div>
<ul>
  <li data-tig-repeat="#{user/looped} as item"><p>Test</p><p data-tig-content="#{item/foo}">repl</p></li>
</ul>
<div data-tig-define="localTest = 'is local!'">
  <div>
    <div data-tig-content="#{localTest}">not local</div>
  </div>
</div>
```

Compatibility
---
It's built as a jQuery extension right now, only because I'm not convinced it's worth adding the attribute selection layer in natively plus DOM Manipulation. If you're using nodejs, then jsdom is your friend and you won't have to do much else.

License
---
BSD

Manual
===
Everything in Tig is set up using data-* attributes. The Tig namespace is reserved for this purpose. Your document will be parsed then in the following order:

* Define
* Condition
* Repeat
* Content
* Replace
* Attributes
* Omit
* Block

Expressions
---
Throughout the document, you will often see reference to the word(s) [expression]. An expression is a statement that can be evaluated into a runnable path. The following are valid expressions:

* #{foo/bar/baz}: In a data object, search and locate the object at `foo.bar.baz`
* "and", "or": map to `&&` and `||` respectively
* "gt", "lt", "gte", "lte": map to `>`, `<`, `>=`, `<=` respectively
* "eq", "ex": map to `==` and `===` respectively
* "structure ": when an expression begins with this, it's literal value will be used (unescaped)

Using the above syntax, the following kinds of expressions are possible

* #{foo/bar} or null: `foo.bar || null`
* #{repeat/index} eq 3: `repeat.index == 3`

data-tig-define="`[local|global] [var] = [expression]`"
---
Define either a [local] or [global] variable named [var], and set it to the provided [expression]. Local variables will last until the tag's closure, while global variables will persist through the parse operation.

data-tig-condition="`[expression]`"
---
Evaluates [expression] and if true, the html will be rendered. If it evaluates to false, the html will be removed from the document.

data-tig-repeat="`[expression] as [var]`"
---
Evaluates [expression] and repeats the given node N times, where N is the number of items in the collection. For any given item, a local variable will be created [var] which contains the item in the iteration.

During the iteration, the following additional variables are available within the "repeat" namespace

* #{repeat/index}: the value of the current iteration (array based)
* #{repeat/number}: the number of the iteration (human readable)
* #{repeat/even}: true if this is an even value
* #{repeat/odd}: true if this is an odd value
* #{repeat/start}: the starting index for the iteration (array based)
* #{repeat/end}: the last value in the iteration (array based)
* #{repeat/length}: the total number of items in the iteration

data-tig-content="`[expression]`"
---
Replace the contents of the node with the results of [expression]

data-tig-replace="`[expression]`"
---
Replace the current node with the results of [expression]

data-tig-attributes="`[attr] [=|+=] [expression]`"
---
Set a given attribute [=] or add to an existing attribute [+=] the value of [expression]. This is useful for supplementing with things such as a class or setting an href for a link.

data-tig-omit="`[expression]`"
---
If the expression evaluates to true, then the block will be removed. This is a simpler form of `data-tig-condition`.

data-tig-block=""
---
This item has no expression. If encountered, the node will be treated as a "null" node, and will remove itself from the document. All its children will be promoted one level.