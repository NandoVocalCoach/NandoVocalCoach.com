// Shared script for the ad landing pages. Page name comes from <body data-page="...">.
(function () {
  var PAGE = document.body.dataset.page || 'landing';
  var track = function () { if (window.fbq) fbq.apply(null, arguments); };

  // WhatsApp links: prefill text + Contact event
  document.querySelectorAll('.js-wa').forEach(function (a) {
    a.href = 'https://wa.me/573008630815?text=' + encodeURIComponent(a.dataset.waText || 'Hi Nando! I have a question.');
    a.target = '_blank'; a.rel = 'noopener';
    a.addEventListener('click', function () { track('track', 'Contact', { content_name: PAGE }); });
  });

  // Book buttons scroll to the payment card
  var book = document.getElementById('book');
  document.querySelectorAll('.js-book').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); book.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  });

  // Sticky bar: after the first screen, hidden while the payment card is on screen
  var sticky = document.getElementById('sticky-cta');
  var bookVisible = false;
  var updateSticky = function () {
    sticky.classList.toggle('show', window.scrollY > window.innerHeight * 0.9 && !bookVisible);
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { bookVisible = es[0].isIntersecting; updateSticky(); }).observe(book);
  }
  window.addEventListener('scroll', updateSticky, { passive: true });

  // Videos: play muted when on screen (captions are burned in); the sound button restarts with sound
  var videos = document.querySelectorAll('video');
  videos.forEach(function (v) {
    var btn = v.parentNode.querySelector('.sound-btn');
    if (btn) btn.addEventListener('click', function () {
      videos.forEach(function (o) { if (o !== v) { o.muted = true; } });
      v.muted = false; v.currentTime = 0; v.play();
      btn.hidden = true;
    });
    v.addEventListener('volumechange', function () { if (btn) btn.hidden = !v.muted; });
  });
  var playIfVisible = function (v, visible) {
    if (visible) { var p = v.play(); if (p && p.catch) p.catch(function () { v.controls = true; }); }
    else v.pause();
  };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { playIfVisible(e.target, e.intersectionRatio > 0.5); });
    }, { threshold: [0, 0.5] });
    // Hero waits for the page to finish loading so the first screen never waits on video
    window.addEventListener('load', function () { videos.forEach(function (v) { io.observe(v); }); });
  } else {
    videos.forEach(function (v) { v.controls = true; });
  }

  // PayPal
  var ppStatus = document.querySelector('.pp-status');
  var ppFailed = function () {
    if (ppStatus) ppStatus.innerHTML = "Checkout didn't load on this browser. Tap the WhatsApp button below and I'll send you a payment link.";
  };
  window.renderPayPalButtons = function (containerId, amount, description, plan) {
    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },
      createOrder: function (data, actions) {
        track('track', 'InitiateCheckout', { value: parseFloat(amount), currency: 'USD', content_name: PAGE });
        return actions.order.create({
          purchase_units: [{ amount: { value: amount }, description: description }]
        });
      },
      onApprove: function (data, actions) {
        return actions.order.capture().then(function (details) {
          var email = (details.payer && details.payer.email_address) || '';
          var name  = (details.payer && details.payer.name)
            ? (details.payer.name.given_name + ' ' + details.payer.name.surname).trim()
            : '';
          // Shared with the pixel on the thank-you page so Meta counts the sale once
          var eventId = 'pp_' + (details.id || Date.now());
          var cookie = function (n) {
            var m = document.cookie.match('(?:^|; )' + n + '=([^;]*)');
            return m ? decodeURIComponent(m[1]) : '';
          };
          // Fire booking email + Meta Conversions API server-side; redirect regardless of outcome
          fetch('https://api.nandovocalcoach.com/session/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              email: email, name: name, plan: plan,
              event_id: eventId, fbp: cookie('_fbp'), fbc: cookie('_fbc'),
              source_url: window.location.href
            })
          }).finally(function () {
            window.location.href = 'https://nandovocalcoach.com/thank-you-payment.html?plan=' + plan + '&eid=' + encodeURIComponent(eventId) + '&src=' + PAGE;
          });
        });
      },
      onError: function () {
        alert('Something went wrong. Please try again or message me on WhatsApp.');
      }
    }).render('#' + containerId).then(function () {
      if (ppStatus) ppStatus.remove();
    }).catch(ppFailed);
  };
  window.lpPayPalReady = function () {
    renderPayPalButtons('paypal-buttons-40', '40.00', '1st Voicebuilding Session — Nando Vocal Coach', '40');
  };
  window.lpPayPalFailed = ppFailed;
  setTimeout(function () { if (!window.paypal) ppFailed(); }, 12000);
})();
