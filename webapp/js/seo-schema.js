/**
 * Chica Map – basic structured data for Google
 */
(function () {
  var data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://justonejewelry.github.io/Chicas-Map/#website",
        "url": "https://justonejewelry.github.io/Chicas-Map/",
        "name": "Chica Map",
        "alternateName": ["Chicas Garage Sale Map", "Chicas Map"],
        "description": "Live map of verified garage sales, yard sales, and estate sales in San Antonio and Texas.",
        "publisher": { "@id": "https://justonejewelry.github.io/Chicas-Map/#org" },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://justonejewelry.github.io/Chicas-Map/map.html",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "Organization",
        "@id": "https://justonejewelry.github.io/Chicas-Map/#org",
        "name": "Chica Map",
        "url": "https://justonejewelry.github.io/Chicas-Map/",
        "logo": "https://justonejewelry.github.io/Chicas-Map/assets/chica/chica-logo.png",
        "sameAs": [
          "https://www.facebook.com/61593215043603/",
          "https://www.tiktok.com/@chicas_map"
        ]
      }
    ]
  };

  var s = document.createElement("script");
  s.type = "application/ld+json";
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
})();
