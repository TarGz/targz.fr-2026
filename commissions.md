---
layout: base
title: Commissions - Custom Pen Plotting Art | Targz
description: Commissioned pen plotted artworks by Targz. Algorithmic Op Art made to order, from single pieces to triptychs.
keywords: pen plotting commissions, custom algorithmic art, commissioned generative art, bespoke op art, personalized pen plotting
permalink: /commissions/
image: /assets/images/targz.webp
---
<br/>
<hgroup style="text-align: center">
  <h2>Commissions</h2>
  <p><small>A selection of my last pen plotter commissions</small></p>
</hgroup>
<br/>
<br/>
<br/>

<script src="{{ '/assets/js/hz.js' | relative_url }}" defer></script>

<section class="home-grid commissions-grid">
    {% for post in site.posts %} {% if post.category == "commissions" %}
    <article class="home-item">
        <a href="{{ post.url | relative_url }}">
            <img src="{{ post.image | relative_url }}" alt="{{ post.title }}" />
            <p class="list-cap"><span class="list-cap-t">{{ post.title }}</span><span class="list-cap-l">{{ post.date | date: "%Y" }}</span></p>
        </a>
    </article>
    {% endif %} {% endfor %}
</section>

<div class="cm-block-wrap"><aside class="cm-block" data-glitch-light>
  <p class="cm-block-t">Your idea. My plotter.</p>
  <p class="cm-block-s">Art pieces, design, generative systems, brand work, strange briefs. Tell me what you have in mind.</p>
  <a class="cm-block-btn" href="{{ '/hello/#work' | relative_url }}">Start the conversation <span aria-hidden="true">→</span></a>
</aside></div>
