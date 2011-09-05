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