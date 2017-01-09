define(function(require) {

    var _ = require("underscore");
    var $ = require("jquery-private");
    var IScroll = require('iscroll');

    require('../jquery.pubsub-loader');
    require('slick');

    var htmlMobile = require('text!tmpl/products-mobile.html');

    var $el = null,
      options = null,
      mobile = $(window).width() < 768,
      scrollerSettings = {
        click: true,
        mouseWheel: true,
        scrollbars: 'custom',
        interactiveScrollbars: true,
        bounce: false,
      },
      isTouch = ('ontouchstart' in window || navigator.maxTouchPoints);

    function sendAnalitics(data, type) {
      if ('object' === typeof data && type && window._tvpa) {
        return _tvpa.push(['track', type, $.extend(data, {
          li: _tvp.lid,
          pg: _tvp.channelId
        })]);
      }
    }

    function startMobile(html) {
      var sliderId = 'tvpprd-slider';
      $('.watch-more-tvp-mobile').show();
      $el.html($('<div/>').attr('id', sliderId));
      var $slider = $el.find('#' + sliderId).html(html).find('script').off().remove().end();
      $slider.find('div[itemprop="product"]').off().remove();

      _.defer(function() {
        startTracking();
        $slider.slick({
          arrows: false,
          infinite: true,
          slidesToShow: 1,
          slidesToScroll: 1,
          dots: true
        });
      });
    }

    var hidePopup = function() {
      $(this).removeClass("active");
      $el.find('.product-popup.active').hide();
    };

    var showPopup = function() {
      $('.product').removeClass('active');
      var $prodThumb = $(this).addClass("active");
      var $popup = $el.find('#product-popup-' + $prodThumb.attr('id').split('-').pop());
      $popup.css({ top: $prodThumb.position().top, right: ($prodThumb.width() + 4) });
      hidePopup();
      if ($popup.hasClass('moved')) {
        $popup.addClass('active').show();
      } else {
        $popup.appendTo($el).addClass('moved active').show();
      }

      var top = $prodThumb.offset().top - $('.tvplightbox-content').offset().top;
      var popupBottomEdge = $popup.offset().top + $popup.height();
      var modalBottomEdge = $('.tvplightbox-content').offset().top + $('.tvplightbox-content').height();

      if (top < 0) {
        top = 0;
      } else if (popupBottomEdge > modalBottomEdge) {
        var excess = popupBottomEdge - modalBottomEdge;
        top = top - excess - 10;
        $popup.css({ top: $prodThumb.position().top - excess - 20 });
      }

      var arrowTop = ($prodThumb.offset().top - $popup.offset().top) + 10;
      if (arrowTop < 0) {
        arrowTop = 10;
      }
      if (arrowTop > $popup.height()) {
        arrowTop = modalBottomEdge - 10;
      }

      $popup.find('.arrow-indicator').css('top', arrowTop);
    };
    function startDesktop(html) {
      var scrollId = 'tvpprd-scroller';
      $('.watch-more-tvp-mobile').hide();
      $el.append("<span id=\"lb-header-rp\">Related Products</span>").append($('<div/>').attr('id', scrollId));
      $el.find('#' + scrollId).html(html).promise().done(function() {
        var scroller = new IScroll('#tvpprd-scroller', scrollerSettings);
        setTimeout(function() { scroller.refresh(); }, 0);
      });
      $el.find('script').off().remove().end().find('div[itemprop="product"]').off().remove();

      if (!isTouch) {
        $el.on('mouseleave', hidePopup);
        $el.on('mouseover', '.product', showPopup);
      } else {
        $(document).on('click', '.product', function(e){
          e.preventDefault();
          return false;
        });
        $(document).on('touchend', '.product', showPopup);
        $(document).on('touchend', '.product.active', hidePopup);
        $(document).on('touchend', function(e){
          if ( !$(e.target).is("#tvpprd-scroller") && !$("#tvpprd-scroller").has(e.target).length && !$(".product-popup.moved.active").has(e.target).length) {
            $('.product').removeClass("active");
            hidePopup();
          }
        });
      }
    }

    function productsLoaded(products, productHtml) {
      if (products.length) {
        $el.show();
        $.each(products, function(index, product) {
          sendAnalitics({ ct: product.id, vd: product.entityIdParent }, 'pi')
        });

        if (mobile) {
          startMobile(_.template(htmlMobile)({
            products: products
          }));
        } else {
          startDesktop(productHtml);
        }

      } else {
        $el.hide();
      }

      $.publish('products:loaded', [products]);
    }

    return {
      init: function(opts, callback) {
        options = opts || {};
        $el = $('<div>').attr('id', 'tvpprd').append("<span id=\"lb-header-rp\">Related Products</span>").appendTo(opts.target);

        $.subscribe('player:play-video', function(e, video) {
          if ("undefined" === typeof video) {
            return console.log('need video id');
          }
          $.ajax({
            url: '//app.tvpage.com/api/videos/'+video.id+'/products',
            dataType: 'jsonp',
            data:{
              'X-login-id': __TVPage__.config.loginId
            },
            success: function(res) {
              productsLoaded(res, _.template(require('text!tmpl/products-desktop.html'))({products:res})); 
            }
          });
        });
        $.subscribe('light-box:hiding', function() {
          if (!mobile) $el.html("");
        });

        var clickTrack = function(){
          sendAnalitics({ ct: $(this).attr("data-pid"), vd: $(this).attr("data-parent") })
        };
        $(document)
        .on('click', '.product-title', clickTrack)
        .on('click', '.tvp-view-now', clickTrack)
        .on('click', '.product', clickTrack)
        .on('click', '.tvp-rating', clickTrack)
        .on('click', '.call-to-action', function(){
          window.open($(this).attr("data-url"),'_blank');
        });
        
        if (_.isFunction(callback)) {
          callback();
        }
      }
    };

});
