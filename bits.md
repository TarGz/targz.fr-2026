---
layout: base
title: Bits - Digital Art & Experiments | Targz
description: Explore digital artworks, experimental projects, and creative coding beyond pen plotting. A collection of diverse creative explorations.
keywords: digital art, experimental art, creative coding, generative design, typography, LEGO art
permalink: /bits/
image: /assets/images/targz.webp
---

<header class="list-head">
  <h1>Bits &amp; Experiments</h1>
  <p>Lego, NFTs, old code. Before and around the plotter.</p>
</header>

<section class="home-grid bits-grid">
    {% for post in site.posts %} {% if post.category == "bits" %}
    <article class="home-item">
        <a href="{{ post.url | relative_url }}">
            <img src="{{ post.image | relative_url }}" alt="{{ post.title }}" />
            <p class="list-cap"><span class="list-cap-t">{{ post.title }}</span><span class="list-cap-l">{{ post.date | date: "%Y" }}</span></p>
        </a>
    </article>
    {% endif %} {% endfor %}
</section>