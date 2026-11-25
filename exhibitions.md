---
layout: base
title: Exhibitions - Pen Plotting Art Shows | Targz
description: Where Targz pen plotted work has been shown, from Paris and the Grand Palais to New York.
keywords: pen plotting exhibitions, op art gallery, generative art shows, algorithmic art exhibition, mathematical art display
permalink: /exhibitions/
image: /assets/images/targz.webp
---

<header class="list-head">
  <h1>Exhibitions</h1>
  <p>Paris, Rouen, New York. And a few others.</p>
</header>

<section class="home-grid exhibitions-grid">
    {% for post in site.posts %} {% if post.category == "exhibitions" %}
    <article class="home-item">
        <a href="{{ post.url | relative_url }}">
            <img src="{{ post.image | relative_url }}" alt="{{ post.title }}" />
            <p class="list-cap"><span class="list-cap-t">{{ post.title }}</span>{% if post.location %}<span class="list-cap-l">{{ post.location }}</span>{% endif %}</p>
        </a>
    </article>
    {% endif %} {% endfor %}
</section>