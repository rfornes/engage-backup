(function($, IScroll, _, BigScreen, Modernizr){
	var liveResultsPage=0;
    var loadMorePage = 0;
    var btnLoadMore = $(".load-more .btn-more-button");
    var searchDesktopInput = $("#tvp-desktop-search-input");
    var searchDesktopButton = $("#brand-header-search-button");
    var $nullResults = $('#tvp-null-results');
    var	resultsScroller;
    var resultsScrollerMObile;
    var $searchMobileInput = $("#tvp-mobile-search-input");
    var $searchMobileCancelBtn = $('.mobile-search-modal-cancel-btn');
    var $searchMobileResultHolder = $('#tvp-mobile-search-results');
    var $nullMobileResults = $('#tvp-mobile-null-results');
    var isLoadMore = false;
    var isIOS = (/iPhone|iPad|iPod/i.test(navigator.userAgent)) ? true : false;
    var isFiltering = false;
    var isSearchHeader = false;
    var initialPlay = true;
    var isFullScreen = false;
    var activeVideoId = null;
    var videoList = [];
    var isSubscribePage = window.location.pathname==="/subscribe/" ? true : false;
    var isMobile = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) ? true : false;
    var isMac = navigator.userAgent.indexOf('Mac OS X') != -1;
    var isFireFox = navigator.userAgent.indexOf('Firefox') != -1;
    var IE = function ( version ) {
         return RegExp('msie' + (!isNaN(version)?('\\s'+version):''), 'i').test(navigator.userAgent);
        };
    var playerResolution = isMobile ? '360p' : '480p';
    var isFlashRequired = ( (IE(9) || IE(10)) || (isMac && isFireFox)  );
    var playerTechOrder = isFlashRequired ? 'flash,html5' : 'html5,flash';
    var formatDate = function(unixTimestamp) {
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'],
        	d = (new Date(Number(unixTimestamp) * 1000)),
        	month = months[d.getMonth()],
			day = '' + d.getDate() + ',',
			year = d.getFullYear();
			return [month, day, year].join(' ');
    };
    var customEllipsis = function () {
        var els = '.latest-video-title';
        var maxHeight = parseInt($(els).css('max-height')) + 1;
        var lineHeight = isLoadMore ? 0 : parseInt($(els).css('line-height'));        

        _.each($(els).find('span'), function (ele, i) {            
            var actualHeight = ele.offsetHeight; //- lineHeight;
            if (actualHeight > maxHeight) {
                $(ele).parent().addClass('tvp-custom-ellipsis');
            }
            else{
                $(ele).parent().removeClass('tvp-custom-ellipsis');
            }
        });
    };
    var lazyLoadImage = function (settings) {
        $(settings.selector).lazyload({
            effect: 'fadeIn',
            container: settings.container
        });
    };

    var channelDataExtractor = {
    	commonRequest : function(url, page, query){
    		return $.ajax({
    			url : url,
    			cache : false,
    			dataType : "jsonp",
    			data : _.extend({}, Filters.selected  ,{
    				p : (page == null || page == undefined) ? 0 : page,
    				n : TVSite.isHomePage ? 6 : 6 ,
    				s : (query == null || query == undefined) ? "" : query,
    				"X-login-id" : TVSite.loginId,
                    //status: 'approved',
                    // o: 'date_created',
                    // od: 'asc',
    			},
                isSearchHeader ? {channelsLimit : TVSite.channelIds} : {})
    		});
    	},
        filters : function(){
            return $.ajax({
                url: TVSite.apiUrl + 'codebook/display/video',
                dataType: 'jsonp',
                data: {
                    'X-login-id': TVSite.loginId,
                    channelId: TVSite.channelId
                }
            });
        },
    	products : function(videoId){
            var url = TVSite.apiUrl+"videos/" + videoId + "/products";
            return this.commonRequest(url, null, null);

    	},
    	channelInfo : function(channelId){
            var url = TVSite.apiUrl+"channels/"+channelId;
            return channelDataExtractor.commonRequest(url,null,null)
    	},
    	video : function(){

    	},
    	videos : function(channelId, page, query){            
    		var url = TVSite.apiUrl+"videos/search";
    		var search = query;
    		if(channelId !== undefined && channelId !== null)
    			url = TVSite.apiUrl +"channels/"+ channelId + "/videos";
    		return this.commonRequest(url,page,search);
    	}
    };

    var renderUtil = {
    	liveResultHtml : '<li><a href="{url}" class="tvp-desktop-search-results-item clearfix"><div class="tvp-desktop-search-results-item-img-holder"><div class="tvp-desktop-search-results-item-img" style="background-image:url({asset.thumbnailUrl});+    	background-position: 50% 50%;"><img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" /></div></div><div class="tvp-desktop-search-results-item-text"><p class="tvp-desktop-search-results-item-title">{title}</p><p class="tvp-desktop-search-results-item-description">{description}</p></div></a></li>',
        videoTemplate : '<div class="col-sm-4 col-md-4 latest-video-container">'
            +'<a href="{url}" class="latest-video" data-id="{id}">'
                +'<div class="latest-video-thumbnail">'        
                    +'<div class="content" >'
                        +'<img class="lazyImgAjax" data-original="{asset.thumbnailUrl}" alt="{title}">'
                        +'<div class="latest-video-hover">'
                            +'<div class="play-icon"></div>'
                            +'<p class="now-playing">NOW PLAYING</p>'
                        +'</div>'
                  +'</div>'
                +'</div>'
                +'<p class="latest-video-title">'
                    +'<span>{title}</span>'
                +'</p>'
            +'</a>'
        +'</div>',
    	getResultUrl :function(result) {
            var redefine = function(val) {
                return ("undefined" !== typeof val && null !== typeof val && val);
            };
            var url = "";
            if (result && redefine(result)) {
                if (TVSite.isSearchPage) {
                    url = TVSite.baseUrl + '/' + String(result.entityTitleParent).replace(/\s/g,"-").replace(/\./g,"") + "/" + String(result.titleTextEncoded).replace(/\s/g,"-") + "/" + (result.entityIdParent || TVSite.channelId) + "-" + result.id+"/";
                }
                else{
                    url = TVSite.baseUrl + '/' +( (isLoadMore || (isFiltering || !isFiltering)) ? TVSite.channelInfo.titleTextEncoded : String(result.entityTitleParent).replace(/\s/g,"-").replace(/\./g,"") )+ "/" + String(result.titleTextEncoded).replace(/\s/g,"-") + "/" + (result.entityIdParent || TVSite.channelId) + "-" + result.id;
                }
            }
            return url.toLowerCase();
        },
        getLiveResultUrl :function(result) {
            var redefine = function(val) {
                return ("undefined" !== typeof val && null !== typeof val && val);
            };
            var url = "";
            if (result && redefine(result)) {
                url = TVSite.baseUrl + '/' +String(result.entityTitleParent).replace(/\s/g,"-").replace(/\./g,"")+ "/" + String(result.titleTextEncoded).replace(/\s/g,"-") + "/" + (result.entityIdParent || TVSite.channelId) + "-" + result.id+"/";
            }
            return url;
        },
    	resetLiveSearch : function() {
            $('#tvp-desktop-search-results ul')
                .empty()
                .closest('#tvp-desktop-search-results-holder')
                .hide();
        },
        showEndOfResults : function() {
            if (!$('.tvp-end-of-results').length) {
                $('<p></p>')
                    .addClass('tvp-end-of-results')
                    .html('No more results')
                    .appendTo('#tvp-desktop-search-results ul');
                this.checkResultsScroller();
            }
        },
        createDesktopScroller : function(id) {
            var scroller=null;
            if (id && $(id).children().length) {
                scroller = new IScroll(id, {
                    interactiveScrollbars: true,
                    scrollX: false,
                    click: true,
                    mouseWheel: true,
                    scrollbars: true,
                    disablePointer: true, // important to disable the pointer events that causes the issues
                    disableTouch: false, // false if you want the slider to be usable with touch devices
                    disableMouse: false // false if you want the slider to be usable with a mouse (desktop)
                });
            }
            return scroller;
        },
        handleScrollEnd : function() {
            if (Math.abs(this.maxScrollY) - Math.abs(this.y) < 10) {
                var val = searchDesktopInput.val();
                channelDataExtractor.videos(null, liveResultsPage + 1,val)
                    .done(function(results) {
                        renderUtil.handleVideoResults(results);
                        liveResultsPage = liveResultsPage + 1;
                    });
            }
        },
        handleScrollEndMobile : function() {
            if (Math.abs(this.maxScrollY) - Math.abs(this.y) < 10) {
                var val = $searchMobileInput.val();
                channelDataExtractor.videos(null, liveResultsPage + 1,val)
                    .done(function(results) {
                        renderUtil.handleMobileSearchResults(results);
                        liveResultsPage = liveResultsPage + 1;
                    });
            }
        },
        checkResultsScroller : function() {
            if (!resultsScroller) {
                resultsScroller = this.createDesktopScroller('#tvp-desktop-search-results-holder');
                resultsScroller.on('scrollEnd', this.handleScrollEnd);
            } else {
                setTimeout(function() {
                    resultsScroller.refresh();
                }, 0);
            }
        },
        checkResultsScrollerMobile : function(){
            if (!resultsScrollerMObile) {
                resultsScrollerMObile = this.createDesktopScroller('#tvp-mobile-search-results-holder');
                resultsScrollerMObile.on('scrollEnd', this.handleScrollEndMobile);
            } else {
                setTimeout(function() {
                    resultsScrollerMObile.refresh();
                }, 0);
            }
        },
    	tmpl : function(template, data) {
            if (template && 'object' == typeof data) {
                return template.replace(/\{([\w\.]*)\}/g, function(str, key) {
                    var keys = key.split("."),
                        v = data[keys.shift()];
                    for (var i = 0, l = keys.length; i < l; i++) v = v[keys[i]];
                    return (typeof v !== "undefined" && v !== null) ? v : "";
                });
            }
            return;
        },
        stripHtml : function(html) {
            var helper = document.createElement('DIV');
            helper.innerHTML = html;
            var helperText = helper.textContent || helper.innerText || '';
            return helperText;
        },
        handleVideoResults: function(results) {
            if (results.length) {
                var html = '',
                    holder = '#tvp-desktop-search-results-holder';
                for (var i = 0; i < results.length; ++i) {
                    var result = results[i];
                    result['url'] = this.getLiveResultUrl(result);
                    if ('description' in result) result.description = this.stripHtml(result.description);
                    html += this.tmpl(this.liveResultHtml, result);
                }
                if(!$(".brand-header-search-container").hasClass("connector"))
                    $(".brand-header-search-container").addClass("connector");
                $('#tvp-desktop-search-results ul')
                    .append(html)
                    .closest(holder)
                    .show();
                renderUtil.checkResultsScroller();

            } else {
                renderUtil.showEndOfResults();
            }
        },
        handleLoadMore: function(results){
            var html = '';
                for (var i = 0; i < results.length; ++i) {
                    var result = results[i];
                    result['url'] = this.getResultUrl(result);
                    videoList.push(result);
                    html += this.tmpl(this.videoTemplate, result);
                }
                
                $('#tvp-video-container').append(html);
                if(isMobile === false || isIOS === false)
                    eventsBinder.onLoadMore();
                // >>
                tvp_Player.showNowPlayingOverlay(activeVideoId);
                lazyLoadImage({
                    selector : '.lazyImgAjax',
                    container: TVSite.isSearchPage ? '#search-content' : '#main-content'
                });
        },
        addFilters : function(filters){
            var getOption = function(opt, selected) {
                var $opt = $('<a/>').attr({'value': opt.code, "href" : "#"});
                var li = $("<li/>");
                if (opt.id) $opt.attr('id', opt.id);
                $opt.html(opt.label || '');                
                li.append($opt[0]);
                return li[0];
            };
            for (var key in filters) {
                var frag = document.createDocumentFragment();
                frag.appendChild(getOption({ code: null, label: key.replace(/_/g, ' ') }));
                var opts = filters[key].options;
                for (var i = 0; i < (opts ? opts.length : 0); i++) {
                    if (opts[i].hasValues) 
                        frag.appendChild(getOption(opts[i]));
                }
                var $filter = $('#' + key );
                if(1=== frag.childElementCount){
                    $filter.removeClass("dropdown-menu");
                    $filter.addClass("tvp-filter-inactive");    
                }
                else{
                    $filter.html(frag);
                    //$filter.addClass('tvp-filter-active');
                }
            }
        },
        handleMobileSearchResults : function (results) {
            if(results.length){
                var template = '<li><div class="item"> <a href="{url}" class="latest-video"><div class="latest-video-thumbnail"><div class="content" style="background-image: url({asset.thumbnailUrl})"></div></div><div class="latest-video-title-mobile"> {title}</div> </a></div></li>',
                    html = '',
                    that = this;
                _.each(results, function(el, idx){
                    var result = results[idx];
                    result['url'] = that.getLiveResultUrl(result);                    
                    html += that.tmpl(template, result);
                });
                $("#tvp-result-list").append(html);
                $('#tvp-mobile-search-results').show();
                renderUtil.checkResultsScrollerMobile();
            }
        },
        renderProd : function(prods, target, templ) {
            var html = "";
            if (prods && prods.length) {
                for (var i = 0; i < prods.length; i++) {
                    var data = JSON.parse(prods[i].data || "");
                    prods[i].linkUrl = data.linkUrl;
                    prods[i].imageUrl = data.imageUrl;
                    html += renderUtil.tmpl(templ, prods[i]);
                }
            } else {
                //no prods
            }

            if (html.length) {
                $(target).html(html);
                if (($(target).length > 0) && !$(target).is(':hidden')) {
                    //registerProductPanel($(target));
                }
                //$searchMobileResultHolder.find('ul').html(html)
                //    .parent().show();
            }
        }
    };

    var search = {
        desktop : function(query){
             return channelDataExtractor.videos(null, null, query);

    	},
    	mobile : function(query){
            return channelDataExtractor.videos(null, null, query);
    	}
    };

    var eventsBinder = {
        onLoadMore : function(){
            $("#tvp-video-container").on({
                click: function(e){
                    if(TVSite.isPlayerPage){
                        //e.preventDefault();
                    }
                },
                mouseover: function(e){
                    if($(this).data('id') == activeVideoId) return;
                    var $hoverDiv = $(this).find('.latest-video-hover');
                    if (!$hoverDiv.hasClass('active')) {
                        $hoverDiv.addClass('active');
                    }
                },
                mouseout: function(e){
                    var $hoverDiv = $(this).find('.latest-video-hover');
                    if ($hoverDiv.hasClass('active')) {
                        $hoverDiv.removeClass('active');
                    }
                }
            }, '.latest-video');            
        },
        Filters : function(){
            $("#product_category li a").on("click", function(event){
                event.preventDefault();
                $(this).parent().parent().prev().find(".selected").text($(this).text());
                var _id = event.currentTarget.id;
                Filters.selected["product_category"] = event.currentTarget.text;
                loadMorePage = 0;
                if(_id){
                    Filters.filterVideos();    
                }
                else{
                    $("#product_category").prev().find(".selected").text("Product Category");
                    Filters.selected["product_category"] = {};
                    Filters.reset();
                }
                
            });


            $("#video_type li a").on("click", function(event){
                event.preventDefault();
                $(this).parent().parent().prev().find(".selected").text($(this).text());
                var _id = event.currentTarget.id;
                Filters.selected["video_type"] = event.currentTarget.text;
                loadMorePage = 0;
                if(_id){
                    Filters.filterVideos();    
                }
                else{
                    $("#video_type").prev().find(".selected").text("Type of Video");
                    Filters.selected["video_type"] = {};
                    Filters.reset();
                }
            });
        },
        VideoThumbnail: function (container) {
            $(container).on('click', '.latest-video', function(event) {
                event.preventDefault();
                activeVideoId = $(this).data('id');
                tvp_Player.loadSelectedVideo(activeVideoId);
                
                breadCrumb.update({
                    text: $(this).find('span').text(),
                    link: $(this).attr('href')
                });
                if (TVSite.channelInfo.entityType !== "5") {
                    videoDetails.updateTranscript({videoId: activeVideoId});
                }
            });
        }
    };

    searchDesktopInput.on("keypress", function(e) {
            if (e.keyCode == 13) {
                e.preventDefault();
            }
    });

    searchDesktopInput.on('keyup', function(e) {
        isLoadMore = false;
        var code = e.keyCode;
        if(code===37 || code===38 || code===39 || code===40)
            return;
        e.preventDefault();
        var val = $(e.target).val();
        renderUtil.resetLiveSearch();
        $nullResults.find(".tvp-null-results-word").text(val);
        if (val) {
        	liveResultsPage = 0;
            isSearchHeader = true;
            isFiltering = false;
            search.desktop(val).done(function(results) {
                isSearchHeader = false;
                var value = searchDesktopInput.val();
            	if (results.length && value !== "") {
                    $nullResults.hide();
            		renderUtil.handleVideoResults(results);
				} else {
                    if(!$(".brand-header-search-container").hasClass("connector")){
                        $(".brand-header-search-container").addClass("connector");
                    }
                    if(value !== ""){
                        $nullResults.show();
                    }else{
                        $(".brand-header-search-container").removeClass("connector");   
                    }
                    renderUtil.resetLiveSearch();
                }
            });
        } else {
            $nullResults.hide();
            if($(".brand-header-search-container").hasClass("connector"))
                $(".brand-header-search-container").removeClass("connector");

            renderUtil.resetLiveSearch();

        }
    });


    searchDesktopInput.focus(function(){
        if(!searchDesktopInput.val()){
    	   $(".brand-header-search-container").animate({width:"+=175"},"fast");
        }
    }).blur(_.debounce(function(){
            searchDesktopInput.val("");
            renderUtil.resetLiveSearch();
            $nullResults.hide();
            $(".brand-header-search-container").animate({ width: '-=175' }, "fast");
            if($(".brand-header-search-container").hasClass("connector"))
                $(".brand-header-search-container").removeClass("connector");
        }, 300));

    searchDesktopButton.click(function(event) {
        if (searchDesktopInput.val()) {
            window.location.href = "/search?s=" + searchDesktopInput.val();
        }
    });

    $searchMobileInput.on('keyup', function(e) {
        e.preventDefault();
        var val = $(e.target).val();
        $nullMobileResults.find('b').html(val);
        if (val) {
            isSearchHeader = true;
            isFiltering = false;
            search.mobile(val).done(function (results) {                
                isSearchHeader = false;
                if(results.length){
                    $("#tvp-result-list").empty();
                    $nullMobileResults.hide();
                    renderUtil.handleMobileSearchResults(results);
                }
                else{
                    $("#tvp-result-list").empty();
                    $searchMobileResultHolder.hide();
                    $nullMobileResults.show();
                }
            });
        }
        else{
            $nullMobileResults.hide();
            $searchMobileResultHolder.hide();
            if(resultsScrollerMObile)
                resultsScrollerMObile.refresh();
            $("#tvp-result-list").empty();
            $searchMobileResultHolder.hide();
        }
    });
    
    $searchMobileCancelBtn.on('click', function(e) {
        e.preventDefault();
        $searchMobileInput.val('');
        $nullMobileResults.hide();
        $searchMobileResultHolder.hide();
        if(resultsScrollerMObile)
            resultsScrollerMObile.refresh();
        $("#tvp-result-list").empty();
        $searchMobileResultHolder.hide();

    });

    btnLoadMore.on("click", function(event){
        isLoadMore = true;
        loadMorePage = loadMorePage+1;
            
        if (TVSite.channelInfo.entityType !== "5") {
            channelDataExtractor.videos(TVSite.channelId, loadMorePage ,null).done(function(data){
                if (data.length)
                    renderUtil.handleLoadMore(data);
                else
                    btnLoadMore.attr("disabled", true);
            });
        }
        else{
            dynamicChannel.fetchNextList(loadMorePage);
        }
        customEllipsis();
    });


    // The filters module.
    var Filters = {
        selected: {},
        defaultFilters: null,
        filters: { video_type: {}, product_category: {} },
        reset : function(){
            //$('.tvp-filter-reset').css("display", "none");
            if(Filters.selected["product_category"].length == undefined && Filters.selected["video_type"].length == undefined);
                $('.tvp-filter-reset').css("display", "none");
            btnLoadMore.attr("disabled", false);
            isFiltering = false;
            loadMorePage = 0;
            $('#tvp-video-container').empty();
            channelDataExtractor.videos(TVSite.channelId, loadMorePage ,null).done(function(data){
            if (data.length)
                renderUtil.handleLoadMore(data);
            });
        },
        filterVideos: function() {
            $('.tvp-filter-reset').css("display", "inline-block");
            isFiltering = true;
            if (loadMorePage===0)
                    $("#tvp-video-container").empty();
            channelDataExtractor.videos(null, loadMorePage, null).done(_.bind(function(results) {
                loadMorePage =  loadMorePage+1;
                if (results.length) {
                    renderUtil.handleLoadMore(results);
                    // if(!isMobile || !isIOS){
                    //     this.hoverCheck();    
                    // }
                } 

            }, this));
        },
        initialize: function() {
            channelDataExtractor.filters().done(_.bind(function(res) {
                for (var i = 0; i < res.length; i++) {
                    var attr = res[i],
                        code = attr.code;
                    if (code in this.filters) {
                        var props = ['id', 'label', 'options'];
                        for (var j = 0; j < props.length; j++) { 
                            this.filters[code][props[j]] = attr[props[j]]; 
                        }
                    }
                }
                renderUtil.addFilters(this.filters);
                eventsBinder.Filters();
                if(isIOS){
                    $(document).on('touchstart', '.tvp-filter-reset', _.bind(function() {
                        Filters.selected = {};
                        this.reset();
                    }, this));
                }
                else{
                    $(document).on('click', '.tvp-filter-reset', _.bind(function() {
                        $("#product_category").prev().find(".selected").text("Product Category");
                        $("#video_type").prev().find(".selected").text("Type of Video");
                        Filters.selected = {};
                        this.reset();
                    }, this));
                }

            }, this));
        }
    };

    var tvp_Player = {
        isFirstPlay: true,
        initialize: function(){
            window.TVPlayer = new TVPage.player({
                divId: 'TVPagePlayer',
                swf: '//appcdn.tvpage.com//player/assets/tvp/tvp-1.5.2-flash.swf',
                displayResolution: tvp_Player.playerResolution,
                analytics: { tvpa : true },
                techOrder: tvp_Player.playerTechOrder,
                onReady: tvp_Player.handlePlayerReady,
                onStateChange: tvp_Player.handlePlayerStateChange,
                controls: {
                    active: true,
                    seekBar: { progressColor: '#779050' },
                    floater: { removeControls:['tvplogo'] }
                }
            });
        },
        playFirstVideo: function(){
            var data = TVSite.channelVideosData ? TVSite.channelVideosData.videos ? TVSite.channelVideosData.videos[0] : {} : {} ;
            TVSite.channelVideosData.video = "undefined" !== typeof TVSite.channelVideosData.video || {};
            TVSite.channelVideosData.video = data;
        },
        updateTitle : function(title){
          if (title) {            
            $('#video-playing-title .video-title-title').empty()
            .html(title);
            $('.video-title-mobile .video-title-mobile-title').empty()
            .html(title);
          }
        },
        showPlayButton : function(){
          $('#html5-play-button').show().on('click', function(){
            window.TVPlayer.play();
            $(this).hide();
          });
        },
        buildVideoData : function(video){
          var data = video.asset || {};
          data.sources = data.sources || [{file: data.videoId}];
          data.type = data.type || 'youtube';
          var channel = TVSite.channelVideosData;
          var id = "";
          if ("object" !== typeof channel && "undefined" !== typeof channel.id) {
            id = channel.id;
          }
          data.analyticsObj = {
            pg: TVSite.channelId || id,
            vd: video.id,
            li: TVSite.loginId
          };
          return data;
        },
        playVideo : function(video){
          if (video) {
            if(inTimeProducts){
                inTimeProducts.destroy();
                inTimeProducts.initialize({
                    videoId: video.id,
                    channelId: TVSite.channelId
                });
            }
            var data = tvp_Player.buildVideoData(video);
            
            if (isMobile) {
              TVPlayer.cueVideo(data);
              if ('youtube' != data.type) {
                tvp_Player.showPlayButton();
              }
            } else {
              TVPlayer.loadVideo(data);
            }
            var url = tvp_Player.getVideoUrl(video);
            if (!this.isFirstPlay) {
                tvp_Player.updateSiteUrlAndTitle(url, video.title);
            }
            this.isFirstPlay = false;
            tvp_Player.updateSocialShareLink(url, video);
            tvp_Player.showNowPlayingOverlay(video.id);
          }
        },
        updateSiteUrlAndTitle : function(url, title){
          var newUrl = window.location.protocol +'//' + window.location.host + url;
          if (newUrl && window.history && history.pushState) {
            history.pushState({state: 1}, null, newUrl);
            if ( 'string' === typeof title ) title = title;
              document.title = title;
          }
        },
        updateSocialShareLink : function(url, video){
          $('.facebook').attr('href', function(i, val) {
            return 'https://www.facebook.com/sharer/sharer.php?u=' + window.location.protocol +'//' + window.location.host + url;
          });

          $('.twitter').attr('href', function(i, val) {
            return 'https://twitter.com/share?text=' + video.title + '%20%7C%0A&url=' + window.location.protocol +'//' + window.location.host  + url;
          });
        },
        getVideoUrl : function(video){
          var url;
          if('undefined' !== typeof video.url){
            url = video.url;
          }else{
            var channel = TVSite.channelVideosData;
            var videoUrl = '/' + channel.id +'-' + video.id;
            var videoTitle = '';
            if (video.titleTextEncoded && video.titleTextEncoded.length > 0 ) {
              videoTitle = '/' + video.titleTextEncoded;
            }
            var channelTitle = '';
            if (channel.titleTextEncoded && channel.titleTextEncoded.length > 0 ) {
              channelTitle = TVSite.baseUrl+'/' + channel.titleTextEncoded;
              //channelTitle = channelTitle.replace("//", "/");
            }
            url = channelTitle + videoTitle + videoUrl+"/";
          }
          return url;
        },
        resizePlayer : function(){
          var $playerHolder = $('#TVPagePlayer');
          if (!isFullScreen && $playerHolder.length) {
            TVPlayer.resize($playerHolder.width(), $playerHolder.height());
          }
        },
        getNextVideo : function(currentIndex, callback){
          if ( ('undefined' !== typeof currentIndex) && ('function' === typeof callback) ) {
            if ( currentIndex == videoList.length - 1 ) {
              callback( videoList[0] );
            } else {
              callback( videoList[ currentIndex + 1 ] );
            }
          }
        },
        handleNextvideo : function(nextVideo){
          if ( 'object' === typeof nextVideo ) {
            tvp_Player.updateTitle( nextVideo.title );
            videoDetails.updateDetails(nextVideo);
            
            videoDetails.updateTranscript({videoId: nextVideo.id});    
            breadCrumb.update({
                text: nextVideo.title,
                link: nextVideo.url
            })        
            tvp_Player.startPlayback(nextVideo);
          }
        },
        getVideoIndex : function(videoId, callback){
          if ( ('undefined' !== typeof videoId) && ('function' === typeof callback) ) {
            var i = 0;
            for ( i; i < videoList.length; i++ ) {
              if ( videoId == videoList[i].id ) return callback(i);
            }
            callback(null);
          }
        },
        handleAutoNext : function(){
          tvp_Player.updateVideoElements();
          tvp_Player.getVideoIndex(activeVideoId, function(index){
            tvp_Player.getNextVideo(index, $.proxy(tvp_Player.handleNextvideo) );
            ProductSlider.initialize({videoId: activeVideoId});
          });
        },
        startPlayback : function(video){
          if ( video && ('object' === typeof video) ) {
            tvp_Player.playVideo(video);
            activeVideoId = video.id;
            //updateProducts(video.id);
            channelDataExtractor.products(activeVideoId).done(function(data){

                renderUtil.renderProd(data, "#mobile-products-wrapper", $("#mobileProduct").html());
                renderUtil.renderProd(data, "#desktop-products-wrapper", $("#desktopProduct").html());
                renderUtil.renderProd(data, "#desktop-products-pop-ups", $("#productPopup").html());
                
            });
            // if(TVSite.productCartridges && TVSite.productCartridges.length){
            //   TVSite.productCartridges.forEach(function(element, index, array){
            //       var targetIsHidden = $(element.target).is(':hidden');
            //       if ( ($(element.target).length > 0) && !targetIsHidden) {
            //         registerProductPanel($(element.target));
            //       }
            //     });
            // }
            tvp_Player.updateTitle(video.title);
          }
        },
        handlePlayerReady : function(){
            debugger;
          videoList = TVSite.channelVideosData.videos;
          tvp_Player.resizePlayer();
          if ( initialPlay && 'channelVideosData' in TVSite ) {
            var video = TVSite.channelVideosData.video;
            tvp_Player.startPlayback(video);
            initialPlay = false;
          }
        },
        handlePlayerStateChange : function(e){
          if ('tvp:media:videoended' == e) {
            if (TVSite.isPlayerPage || TVSite.isChannelPage) {
              tvp_Player.handleAutoNext();
            }
          }
        },
        updateVideoElements : function(){
          // $('.channel-videos').find('.video.playing').removeClass('playing').addClass('inactive');
        },
        loadSelectedVideo: function (videoId) {
            tvp_Player.getVideoIndex(activeVideoId, function(index){
                tvp_Player.handleNextvideo(videoList[index]);
                ProductSlider.initialize({videoId: activeVideoId});
                videoDetails.updateDetails(videoList[index]);
                if (TVSite.channelInfo.entityType === "5") {
                    videoDetails.updateTranscript({transcripts: videoList[index].transcripts});
                }
            });
        },
        showNowPlayingOverlay: function (videoId) {
            var $list = $('.latest-video'),
                selected = _.find($list, function (el) {
                                return $(el).data('id') == videoId;
                            });
            $list.find('.latest-video-hover').removeClass('now-playing');
            $(selected).find('.latest-video-hover').addClass('now-playing');
        }
    };

    var inTimeProducts = {

            status: false,

            products: null,

            queue: {},

            productTemplate: '<a id="{id}" href="{data.linkUrl}" data-video-id="{entityIdParent}" target="_blank" class="in-time-product"><span class="in-time-unit in-time-title">{title}</span><span class="in-time-unit in-time-cta">VIEW DETAILS</span></a>',

            initialize: function(settings) {
                this.settings = settings || {};
                this.setElement();
                this.initializeProducts();
                this.status = true;
            },

            setElement: function() {
                $('<div/>').attr('id', 'in-time-products').prependTo('#player-holder');
                this.$el = $('#in-time-products');
            },

            getSpotTimeUrl: function() {
                if ('channelId' in this.settings && 'videoId' in this.settings) {
                    return TVSite.apiUrl + 'spot/link/time/' + this.settings.channelId + '/' + this.settings.videoId;
                }
            },

            getProducts: function(callback) {
                if (callback && 'function' === typeof callback) {
                    return $.ajax({
                        url: this.getSpotTimeUrl(),
                        dataType: 'json',
                        data :{
                            "X-login-id" : TVSite.loginId
                        }
                    }).done(callback);
                }
            },

            cleanPrice: function(price) {
                if (price && 'string' === typeof price) {
                    if (price.indexOf('.') !== -1) {
                        var decimals = price.split('.').pop();
                        if (decimals.length > 2 && decimals.indexOf('00') !== -1) {
                            price = price.slice(0, -2);
                        } else if (decimals.length === 1) {
                            price = price + '0';
                        }
                    } else {
                        price = price + '.00';
                    }
                }
                return price;
            },

            renderProducts: function() {
                var html = '';
                for (var i = 0; i < this.products.length; ++i) {
                    var product = this.products[i];
                    if ('data' in product && 'string' === typeof product.data) {
                        product.data = JSON.parse(product.data);
                    }
                    html += renderUtil.tmpl(this.productTemplate, product);
                }
                this.$el.html(html);
            },

            initializeProducts: function() {
                var that = this;
                this.getProducts(function(res, status) {
                    if ('success' === status && res.length) {
                        that.products = res;
                        that.renderProducts();
                        that.bindProductClick();
                        that.setQueue();
                        that.initializeWatcher();
                    }
                });
            },
            bindProductClick: function() {
                this.$el.find('.in-time-product').on('click', function(e) {
                    sendAnalytics({ vd: $(this).data('videoId'), ct: $(this).attr('id') }, 'pk');
                });
            },

            setQueue: function() {
                if (this.products) {
                    for (var i = 0; i < this.products.length; ++i) {
                        var product = this.products[i],
                            endTime = Number(product.startTime) + Number(product.duration);
                        this.queue[product.id] = [Number(product.startTime), endTime];
                    }
                }
            },

            getPlayerTime: function() {
                return Math.floor(window.TVPlayer.getCurrentTime() * 1000);
            },

            initializeWatcher: function() {
                var that = this;
                this.watcher = setInterval(function() {
                    for (var key in that.queue) {
                        var time = that.getPlayerTime(),
                            item = that.queue[key];
                        if (time > item[0] && time < item[1]) that.showProduct(key);
                        if (time < item[0]) that.hideProduct(key);
                        if (time > item[1]) that.hideProduct(key);
                    }
                }, 50);
            },
            hideProduct: function(id) {
                if ('undefined' !== id) this.$el.find('#' + id).css('top', '-100px');
            },

            showProduct: function(id) {
                var $product = this.$el.find('#' + id);
                if ($product.css('top') === '-100px') {
                    $product.css('top', '0');
                }
            },

            destroy: function() {
                if (this.status) {
                    clearInterval(this.watcher);
                    this.$el.find('.in-time-product').off();
                    this.$el.remove();
                    this.status = false;
                }
            }

        };

    
    var ProductSlider = {
            star : '<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">'
                    +'<path d="M0 0h24v24H0z" fill="none"/>'
                    +'<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>'
                    +'<path d="M0 0h24v24H0z" fill="none"/>'
                +'</svg>',
            halfStar : '<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'
                    +'<defs>'
                    +    '<path d="M0 0h24v24H0V0z" id="a"/>'
                    +'</defs>'
                    +'<clipPath id="b">'
                        +'<use overflow="visible" xlink:href="#a"/>'
                    +'</clipPath>'
                    +'<path clip-path="url(#b)" d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4V6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/>'
                +'</svg>',
            emptyStar : '<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">'
                    +'<path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/>'
                    +'<path d="M0 0h24v24H0z" fill="none"/>'
                +'</svg>',
            breakpoint: 992,
            products : [],
            $currentPopUp: null,
            currentId: 0,
            isHorizontalScroll: false,            
            el: '[data-toggle="popover"]',
            prodSlider: null,
            config: {
                scrolly: {
                    interactiveScrollbars : true,
                    scrollX : false,
                    mouseWheel : true,
                    scrollbars : true,
                    fadeScrollbars: true
                },
                scrollx: {
                    scrollX : true,
                    scrollY : false,
                    mouseWheel : true,
                    tap : true,
                    click: true
                }
            },
            initialize: function (settings) {
                this.destroy();
                var opt = settings || {};
                var that = this;
                channelDataExtractor.products(opt.videoId)
                    .done(function (results) {
                        if(results.length){
                            that.products = results;
                            that.renderProducts(results);
                            Analytics.registerProductPanel($('#tvp-products-wrapper .tvp-product-image'));
                            that.initializePopupProducts();
                            that.initializeSlider();
                            that.bindEvents();
                        }
                        else{
                            that.destroy();
                            $('#tvp-products-wrapper ul').html('');
                        }
                    });
            },
            renderProducts: function (results) {                
                var template = '<li> <a data-id="{id}" href="{linkUrl}" target="_blank" class="analyticsClick"><div id="{id}" data-toggle="popover" class="tvp-product-image" data-videoId="{videoId}"><div class="content"> <img src="{imageUrl}" alt=""></div></div> </a></li>',
                    html = '';
                this.products = results;

                _.each(results, function (el, idx) {
                    var result = results[idx];
                    
                    if ((result['OUT_OF_STOCK'] === 'Y') && (_.isEmpty(result['price']))) {
                        result['price'] = "Out Of Stock";
                    }
                    else{                        
                        if (result['price'].indexOf('$') < 0) {
                            result['price'] = '$' + result['price'];
                        }
                    }                    
                    result['videoId'] = activeVideoId || TVSite.channelVideosData.video.id;
                    html += renderUtil.tmpl(template, result); 
                    
                    schemaStructure.createProductSchema({
                        name: result.title,
                        image: result.imageUrl,
                        description: result.description,
                        mpn: result.mpn,
                        price: result.price
                    });
                });
                $('.tvp-products-wrapper ul').html(html);
            },
            bindEvents: function () {
                var that = this;
                $(this.el).popover({
                    placement: 'left',
                    template: '<div class="popover tvp-prod-hover" role="tooltip"><div class="arrow"></div><div class="popover-content tvp-prod-hover-content"></div></div>',
                    html: true,
                    trigger: 'manual',
                    container: 'div.player-product',
                    content: function(){
                        var hoverTmpl = '<div class="tvp-prod-hover-img-container"><div class="content"> <img src="{imageUrl}" alt=""></div></div><div class="tvp-prod-hover-title">{title}</div><div class="tvp-prod-hover-price-rate"> <span class="price">{price}</span><span class"rate">{rate}</span></div> <a data-id="{id}" href="{linkUrl}" target="_blank" class="btn btn-primary btn-more-button analyticsClick">VIEW DETAILS</a>';
                        var hoverHtml = '';
                        var prodId = $(this).attr('id');


                        var currentProd = _.filter(that.products, function(item){
                            return item.id == prodId;
                        })[0];

                        hoverHtml = renderUtil.tmpl(hoverTmpl, currentProd);

                        return hoverHtml;
                    }
                }).on({
                    'mouseenter' : function () {
                        if(!isMobile){
                          if (that.currentId === 0) {
                              $(this).popover('show');
                          }
                          else{
                              var _id = $(this).attr('id');
                              if (_id !== that.currentId) {
                                  $('div[id="'+that.currentId+'"][data-toggle="popover"]').popover('hide');
                                  $(this).popover('show');
                              }
                          }                        
                        }
                    },
                    'show.bs.popover': function () {
                        that.currentId = $(this).attr('id');
                    },
                    'hide.bs.popover': function () {
                        that.currentId = 0;
                    }
                });

                if (!$._data( $('.player-product')[0], 'events' )) {
                    $('.player-product').on('mouseleave', '.popover', function() {
                        $('div[id="'+that.currentId+'"]').popover('hide');
                        that.currentId = 0;
                    }).on('mouseleave', function() {
                        $('*[data-toggle="popover"]').popover('hide');                
                    }).on('click', '.analyticsClick', function(e) {
                        e.stopPropagation();
                        //Analytics.registerProductClick($(this).data('id'));
                    });
                }
                $('.player-product').on('mouseleave', '.popover', function() {
                    $('div[id="'+that.currentId+'"]').popover('hide');
                    that.currentId = 0;
                }).on('mouseleave', function() {
                    $('*[data-toggle="popover"]').popover('hide');                
                });

                if(isMobile){
                  $('.player-product').off('touchstart').on('touchstart', '.analyticsClick', function(e) {
                    e.stopPropagation();
                    Analytics.registerProductClick($(this).data('id'));
                  });
                }else{
                  $('.player-product').off('click').on('click', '.analyticsClick', function(e) {
                      e.stopPropagation();
                      Analytics.registerProductClick($(this).data('id'));
                  });

                }
            },
            initializeSlider: function () {
                var config = {};
                
                if ($(window).width() < this.breakpoint) {
                    this.resizeWrapper(true);
                    this.isHorizontalScroll = true;
                }
                else{
                    this.isHorizontalScroll = false;
                }

                this.prodSlider = new IScroll('#tvp-products-wrapper', $(window).width() < this.breakpoint ? this.config.scrollx : this.config.scrolly);
            },
            initializePopupProducts: function () {
                var that = this;
                $(this.el).popover({
                    placement: function (d, t) {
                        return Modernizr.mq('(max-width: 1199px)') ? 'top' : 'left';
                    },
                    template: '<div class="popover tvp-prod-hover" role="tooltip"><div class="arrow"></div><div class="popover-content tvp-prod-hover-content"></div></div>',
                    html: true,
                    trigger: 'manual',
                    container: 'div.player-product',
                    content: function(){
                        var hoverTmpl = '<div class="tvp-prod-hover-img-container"><div class="content"> <img src="{imageUrl}" alt=""></div></div><div class="tvp-prod-hover-title">{title}</div><div class="tvp-prod-hover-price-rate"> <span class="price">{price}</span><span class="rate">{rate}<span></div> <a data-id="{id}" href="{linkUrl}" target="_blank" class="btn btn-primary btn-more-button analyticsClick">VIEW DETAILS</a>';
                        var hoverHtml = '';
                        var prodId = $(this).attr('id');

                        var currentProd = _.filter(that.products, function(item){
                            return item.id == prodId;
                        })[0];

                        var stars = "";
                        if(currentProd["rating"]){
                            var totalStars = 0;
                            var rate = currentProd["rating"].toString();
                            var rateArray = rate.split(".");
                            if (rateArray.length > 0){
                                for (var i = 0; i < rateArray[0]; i++) {
                                    stars +=  "<span class='tvp-star-full'>"+ProductSlider.star+"</span>";
                                    totalStars = totalStars+1;
                                }
                                if(rateArray[1]){
                                    totalStars = totalStars+1;
                                    var decimal = parseFloat(rateArray[1]);
                                    if (decimal >= .7){
                                        stars += "<span class='tvp-star-full'>"+ProductSlider.star+"</span>";
                                    }
                                    else if(decimal > .3 && decimal < .7){
                                        stars += "<span class='tvp-star-half'>"+ProductSlider.halfStar+"</span>";   
                                    }
                                    else{
                                        stars += "<span class='tvp-star-empty'>"+ProductSlider.emptyStar+"</span>";      
                                    }
                                }
                                if(totalStars<5){
                                    var remaining = 5- totalStars;
                                    for (var i = 0; i < remaining; i++) {
                                        stars +=  "<span class='tvp-star-empty'>"+ProductSlider.emptyStar+"</span>";
                                    }
                                }
                            } 

                        }
                        currentProd["rate"] = stars;

                        hoverHtml = renderUtil.tmpl(hoverTmpl, currentProd);

                        return hoverHtml;
                    }
                });
            },
            resizeWrapper: function (isX) {                
                if (isX) {
                    var xWidth = 0;
                    _.each($('#tvp-products-wrapper li'), function(el, i){
                        xWidth+=$(el).outerWidth();
                    });    
                    $('#tvp-products-wrapper ul').width(xWidth);
                }
                else{
                    $('#tvp-products-wrapper ul').width('100%');
                }
            },
            destroy: function () {
                $(this.el).popover('destroy');
                if(this.prodSlider){
                    this.prodSlider.destroy();
                    this.prodSlider = null;                    
                }
            },
            resizeCheck: function () {                
                if (($(window).width() < this.breakpoint) && (!this.isHorizontalScroll)) {
                    this.isHorizontalScroll = true;
                    this.prodSlider.destroy();
                    this.resizeWrapper(true);
                    this.prodSlider = new IScroll('#tvp-products-wrapper', this.config.scrollx);
                }
                else if(($(window).width() >= this.breakpoint)){
                    this.isHorizontalScroll = false;
                    this.prodSlider.destroy();
                    this.resizeWrapper(false);
                    this.prodSlider = new IScroll('#tvp-products-wrapper', this.config.scrolly);
                }
            }
    }

    var Analytics = {
        registerProductPanel: function ($products) {
            var that = this;
            _.each($products, function(v, k){                
                that.sendAnalytics({
                    vd: $(v).data('videoid'),
                    ct: $(v).attr('id')
                }, 'pi');
            });
        },
        registerProductClick: function (prodId) {
            this.sendAnalytics({
                vd: activeVideoId || TVSite.channelVideosData.video.id,
                ct: prodId
            }, 'pk');
        },
        sendAnalytics: function(data, type) {
            if ('object' == typeof data && type) {
                _tvpa.push(['track', type, $.extend(data, {
                    li: TVSite.loginId,
                    pg: TVSite.channelId
                })]);
            }
        }
    }

    var videoDetails = {
        container : '.video-details',
        updateDetails: function (videoObj) {
            $(this.container).find('.published-date').text(videoObj.date_created)
                .closest(this.container)
                .find('.video-details-row.description .desktop, .mobile')
                .html(function (i, s) {
                    return videoObj.description.replace(/(?:\r\n|\r|\n)/g, '<br />');                    
                })
                .closest(this.container)
                .find('.video-details-row.duration span').html(videoObj.asset.prettyDuration);
            
            this.updatePublishedDate();
            this.checkDetails();
        },
        updatePublishedDate : function(){
            $(this.container).find('.published-date').text(function(i, s){
                return formatDate(s);
            });
        },
        checkDetails: function () {
            var $detailsRow = $(this.container).find('.video-details-row.description');
            var descHeight = $detailsRow.find('.desktop').height();
            var containerHeight = $detailsRow.height();
            //var x = $detailsRow.css('max-height');
            if(containerHeight < descHeight){
                $detailsRow.addClass('show-more-active');
                $(this.container).find('.show-more').show();
            }
            else{
                $(this.container).find('.show-more').hide();
            }
        },
        initializeShowMoreButton: function () {
            var $btnShowMore = $(this.container).find('.btn-more-btn-container button'),
                $descContainer = $(this.container).find('.description');
            
            $btnShowMore.on('click', function(event) {
                event.preventDefault();
                if (!$descContainer.hasClass('expand-description')) {
                    $descContainer.addClass('expand-description')
                        .removeClass('show-more-active');
                    $(this).html('SHOW LESS');
                }
                else{
                    $descContainer.removeClass('expand-description')
                        .addClass('show-more-active');;
                    $(this).html('SHOW MORE');
                }
            });
        },
        updateTranscript: function (opt) {
            var that = this;
            if (TVSite.channelInfo.entityType !== "5") {             
                $.ajax({
                    url: TVSite.apiUrl + "videos/" + opt.videoId + "/transcript",
                    dataType: 'jsonp',
                    data: {'X-login-id': TVSite.loginId}
                })
                .done(function(data) {
                    if (data) {
                        $(that.container).find('#transcript > div').html(data.transcripts);
                    }
                    else{
                        $(that.container).find('#transcript > div').html("");
                    }
                });
            }
            else{
                $(that.container).find('#transcript > div').html(opt.transcripts);
            }
        }
    }

    var schemaStructure = {
        createSchema: function (opt) {
            if (TVSite.isHomePage) {
                this.renderSchema(this.webPage(opt));
            }
            if (TVSite.isPlayerPage) {
                this.renderSchema(this.videoObject(opt));
            }
            if (TVSite.isChannelPage){
                this.renderSchema(this.videoObject(opt));
            }
        },
        renderSchema: function (schema) {
            var data = [];
            var el = document.createElement('script');
            data.push(schema);
            el.type = 'application/ld+json';
            el.text = JSON.stringify(data);
            document.querySelector('head').appendChild(el);
        },
        createProductSchema: function (opt) {
            var schemaStructure = {
              "@context": "http://schema.org/",
              "@type": "Product",
              "name": opt.name,
              "image": opt.image,
              "description": opt.description,
              "mpn": opt.mpn,
              "offers": {
                "@type": "Offer",
                "priceCurrency": "USD",                
                "price": opt.price === 'Out Of Stock' ? '0.00' : opt.price,
                "availability" : opt.price === 'Out Of Stock' ? "http://schema.org/OutOfStock" : "http://schema.org/InStock"
              }
            };
            this.renderSchema(schemaStructure);
        },
        videoObject: function (opt) {
            return {
                "@context": "http://schema.org",
                "@type": "VideoObject",
                "name": opt.title,
                "description": opt.description,
                "thumbnailUrl": opt.thumbnailUrl,
                "uploadDate": opt.uploadDate,
                "duration": opt.duration,
                "contentUrl": opt.contentUrl,
                "embedUrl": opt.embedUrl, 
                "PotentialAction": {
                    "@type" : "ViewAction",
                    "Target" : opt.contentUrl
                }
            }
        },
        viewAction: function (opt) {
            return {
                "@context": "http://schema.org",
                "@type": "ViewAction",
                "Target": opt.contentUrl
            }
        },
        webPage: function (opt) {
            return {
              "@context": "http://schema.org",
              "@type": "WebPage",
              "name": opt.title,
              "description": opt.description || '',
              "PotentialAction": {
                "@type": "ViewAction", 
                "Target": opt.contentUrl
              }
            }
        },
        productObject: function (opt) {
            return {
              "@context": "http://schema.org/",
              "@type": "Product",
              "name": opt.name,
              "image": opt.image,
              "description": opt.description,
              "mpn": "925872",
              // "brand": {
              //   "@type": "Thing",
              //   "name": "ACME"
              // },
              // "aggregateRating": {
              //   "@type": "AggregateRating",
              //   "ratingValue": "4.4",
              //   "reviewCount": "89"
              // },
              "offers": {
                "@type": "Offer",
                "priceCurrency": "USD",
                "price": opt.price
                // "priceValidUntil": "2020-11-05",
                // "itemCondition": "http://schema.org/UsedCondition"
                // "availability": "http://schema.org/InStock",
                // "seller": {
                //   "@type": "Organization",
                //   "name": "Executive Objects"
                // }
              }
            }
        }
    }

    var breadCrumb = {
        update: function (opt) {
            var $breadcrumb = $('.breadcrumb #breadcrumb-2');
            $breadcrumb.find('span').empty().html(opt.text)
                .closest('#breadcrumb-2')
                .find('a').attr('href', opt.link);
        }
    }

    var dynamicChannel = {
        loadedVideoList: [],
        initialize: function () {
            var that = this;
            channelDataExtractor.videos(TVSite.channelVideosData.id, 0, '')
                .done(function (res) {
                    if (res.length) {
                        TVSite.channelVideosData.videos = res;
                        TVSite.channelVideosData.video = res[0];
                        TVSite.activeChannelVideosTotal = res.length;
               
                        tvp_Player.initialize();

                        ProductSlider.initialize({videoId: TVSite.channelVideosData.video.id});
                        schemaStructure.createSchema({
                            title: TVSite.channelVideosData.video.title,
                            description: TVSite.channelVideosData.video.description,
                            thumbnailUrl: TVSite.channelVideosData.video.asset.thumbnailUrl,
                            uploadDate: formatDate(TVSite.channelVideosData.video.date_created),
                            duration: TVSite.channelVideosData.video.asset.mediaDuration,
                            contentUrl: "https://www.youtube.com/watch?v="+TVSite.channelVideosData.video.referenceId,
                            embedUrl: "https://app.tvpage.com/swf/guide/"+ TVSite.channelVideosData.video.titleTextEncoded +"?u="+TVSite.loginId+"&amp;p="+TVSite.channelInfo.id+"&amp;v=" + TVSite.channelVideosData.video.id
                        });

                        videoDetails.updateDetails(TVSite.channelVideosData.video);
                        videoDetails.checkDetails();
                        videoDetails.updateTranscript({transcripts: TVSite.channelVideosData.video.transcripts});

                        that.loadedVideoList = _.first(res, 6);
                        renderUtil.handleLoadMore(that.loadedVideoList);
                    }
                    
                    console.log('dynamicChannel.initialize', TVSite);
                });
        },
        fetchNextList: function (page) {
            var that = this;
            var filtered  = _.filter(TVSite.channelVideosData.videos, function(item){
                var isPresent = _.find(that.loadedVideoList, function(loadedItem){
                    return loadedItem.id === item.id ? true : false;
                });
                if (!isPresent) return item;
            });
            var result = _.first(filtered, 6);
            _.each(result, function(item){
                that.loadedVideoList.push(item);
            });
            renderUtil.handleLoadMore(result);
            if (result.length < 6) {
                btnLoadMore.attr('disabled', true);
            }
        }
    }

    $('.slider').slick({
        infinite: true,
	    speed: 900,
	    slidesToShow: 4,
	    slidesToScroll: 1,
	    responsive: [{
	        breakpoint: 768,
	        settings: {
	            arrows: false,
	            slidesToShow: 3,
	            slidesToScroll: 3
	        }
	    },{
            breakpoint: 1199,
            settings:{
                arrows: false
            }
        }]
    });
    
    if(isMobile === false || isIOS === false)
	   eventsBinder.onLoadMore();
    //all calls will be defined here

    if (TVSite.isHomePage) {
        schemaStructure.createSchema({
            contentUrl: window.location.href,
            title: TVSite.channelInfo.title,
            description: TVSite.channelInfo.description
        });        
    }

    if (TVSite.isChannelPage) {
        Filters.initialize();
        schemaStructure.createSchema({
            contentUrl: window.location.href,
            title: TVSite.channelInfo.title
        });
        if(TVSite.channelInfo.entityType === "5"){
            dynamicChannel.initialize();
        }
    }

    if (TVSite.isPlayerPage || TVSite.isChannelPage) {
        /**
        * Fullscreen poll/check
        */
        if (BigScreen) {
            BigScreen.onchange = function () {
              isFullScreen = !isFullScreen;
            };
        }

        /**
        * Resize player on window resizing
        */
        $(window).resize(function(){
            if (!isFullScreen) { tvp_Player.resizePlayer(); }
            ProductSlider.resizeCheck();
        });

        if (TVSite.channelInfo.entityType !== "5") {
            tvp_Player.initialize();
            if (TVSite.isChannelPage && tvp_Player.isFirstPlay) {
                tvp_Player.playFirstVideo();
            }
            ProductSlider.initialize({videoId: TVSite.channelVideosData.video.id});
            schemaStructure.createSchema({
                title: TVSite.channelVideosData.video.title,
                description: TVSite.channelVideosData.video.description,
                thumbnailUrl: TVSite.channelVideosData.video.asset.thumbnailUrl,
                uploadDate: formatDate(TVSite.channelVideosData.video.date_created),
                duration: TVSite.channelVideosData.video.asset.mediaDuration,
                contentUrl: "https://www.youtube.com/watch?v="+TVSite.channelVideosData.video.referenceId,
                embedUrl: "https://app.tvpage.com/swf/guide/"+ TVSite.channelVideosData.video.titleTextEncoded +"?u="+TVSite.loginId+"&amp;p="+TVSite.channelInfo.id+"&amp;v=" + TVSite.channelVideosData.video.id
            });

            videoDetails.updatePublishedDate();
            videoDetails.checkDetails();
            videoDetails.initializeShowMoreButton();
        }
        eventsBinder.VideoThumbnail('#tvp-video-container');
    }

    if (TVSite.isSearchPage) {        
        var $searchHeader = $('.search-header');
        var getUrlParams = function(){
                var o = {};
                if (window.location && 'search' in location) {
                    var kv = location.search.substr(1).split('&'), params = [];
                    for (var i = 0; i < kv.length; i++) { params.push(kv[i]); }
                    for (var i = 0; i < params.length; i++) {
                        var param = params[i].split('=');
                        o[param[0]] = decodeURIComponent(param[1]);
                    }
                   
                }
                return o;
            };
        var renderResult = function (res) {
                if (res.length) {
                    if (res.length < 6) {
                        $searchLoadBtn.attr("disabled", true);
                    }
                    else{
                        $searchLoadBtn.attr("disabled", false);
                    }
                    renderUtil.handleLoadMore(res);

                }
                else{
                    $searchLoadBtn.attr("disabled", true);
                }                
            };
        var params = getUrlParams();
        var $searchLoadBtn = $('.search-more .btn-more-button');
        
        $searchLoadBtn.attr("disabled", true);
        $searchHeader.find('.search-header-query').text(params.s);


        $.ajax({
            url: TVSite.apiUrl + 'videos/search',
            dataType: 'jsonp',
            data: { 
                s: params.s,
                p: liveResultsPage,
                n: 1000,
                'X-login-id': TVSite.loginId,
                //status: 'approved',
                o: 'date_created',
                od: 'desc',
                channelsLimit: TVSite.channelIds
            },
        })
        .done(function(res) {
            $searchHeader.find('.search-count').html(res.length);
            if (res.length) {
                renderResult(_.first(res, 6));
            }
        });

        $searchLoadBtn.click(function(event) {
            liveResultsPage += 1;
            channelDataExtractor.videos(null, liveResultsPage, params.s).done(function(res){
                renderResult(res);
            });
        });
    }

    $('#subscribe-header').on('click', function(event) {
        event.preventDefault();
        $('#subcribeModal')        
        .modal('show')
        .find('.channel-title, .chkSubscribeAll').css('display', 'none');
    });
    $('#subscribe-channel').on('click', function(event) {
        event.preventDefault();
        if(isMobile){            
            window.location.href = "/subscribe/"+(TVSite.isChannelPage ? ("?channelId="+TVSite.channelId) : "");// + $(this).data('channelid');
            return false;
        } 
        $('#subcribeModal')        
        .modal('show')
        .find('.channel-title, .chkSubscribeAll').css('display', 'block');
    });


	$('#subcribeModal').on('show.bs.modal', function(event) {
        if (TVSite.isPlayerPage || TVSite.isChannelPage) {
            window.TVPlayer.pause();
        }
		$('.subscribe-body').show();
		$('.subscribed-body').hide();
	}).on('hidden.bs.modal', function(event) {
        if (TVSite.isPlayerPage || TVSite.isChannelPage) {
            window.TVPlayer.play();
        }
    });

	$('.subscribe-button').on('click', function(event) {
		event.preventDefault();
		$('.subscribe-body').hide();
		$('.subscribed-body').show();
	});

    $('#mobile-menu').on('click', function(event) {
        event.preventDefault();
        $('#mobile-menu-modal').modal();
    });
    $('.mobile.collapse').on({
        'show.bs.collapse': function(){            
            $('.caret').animate({  borderSpacing: -180 }, {
                step: function(now,fx) {
                  $(this).css({
                    '-webkit-transform': 'rotate('+now+'deg)',
                    '-moz-transform': 'rotate('+now+'deg)',
                    'transform': 'rotate('+now+'deg)'
                  });
                },
                duration:'slow',
                complete: function () {
                    $(this).addClass('up').removeAttr('style');
                }
            },'linear');

        },
        'hide.bs.collapse': function () {
            $('.caret').animate({  borderSpacing: 180 }, {
                step: function(now,fx) {                    
                  $(this).css({
                    '-webkit-transform': 'rotate('+now+'deg)',
                    '-moz-transform': 'rotate('+now+'deg)',
                    'transform': 'rotate('+now+'deg)'
                  });
                },
                duration:'slow',
                complete: function(){
                    $(this).removeClass('up').removeAttr('style');
                }
            },'linear');
        }
    });
    $('#mobile-subscribe').click(function(e) {
        e.preventDefault();
        window.location.href = "/subscribe";
    });
    $('#mobile-search').on('click', function(event) {
        event.preventDefault();
        $('#mobile-search-modal').modal();
    });

    if(isSubscribePage){
        var path  = window.location.href;
        var params = path.split("?")
        if (params.length === 2){
            var channelValue = params[1].split("=");
            if(channelValue.length==2){
                channelDataExtractor.channelInfo(channelValue[1]).done(function(data){
                    var checkbox = '<div class="chkSubscribeAll">'
                        +'<input type="checkbox" name="" id="">Subscribe me  to all updates.'
                    +'</div>';
                    $(".channel-title").empty().text(data.title);
                    $("#mail").addClass("channel-check");
                    $(checkbox).insertAfter($("#mail"));
                });
            }
        }
    }

    $(window).on('orientationchange', function(event) {
        customEllipsis();
    });

    $(window).bind("pageshow", function() {
        searchDesktopInput.val("");
    });
    

    $('form').get(0).reset();    
    customEllipsis();

    lazyLoadImage({
        selector: '.lazyImg',
        container: '#main-content'
    });    
}(jQuery, window.IScroll, window._, window.BigScreen, window.Modernizr));
