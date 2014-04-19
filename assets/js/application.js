function c(c){ console.log(c)}
$(function(){
	var ArawdRecord = Backbone.Model.extend({
		defaults: function() {
	      return {
	        title: "你还没有奖品记录！"
	      };
	    },initialize: function() {
	      if (!this.get("title")) {
	        this.set({"title": this.defaults().title});
	      }
	    }
	});

	var ArawdRecords = Backbone.Collection.extend({
		model : ArawdRecord
	});

	var EduuRouter = Backbone.Router.extend({

		//map url routes to contained methods
		routes: {
			"": "home",
			"home": "home",
			"result": "result",
			"info": "info"
		},

		hidePages: function(){
			//hide all pages with 'pages' class
			$("body").html("");
		},

		showPage: function(page){
			//hide all pages
			this.hidePages();
			//show passed page by selector
			$("body").html($(page).html());
		},

		home: function() {
			this.showPage('script#home-page');
		},

		result: function() {
			this.showPage('script#result-page');
		},

		info: function() {
			this.showPage('script#info-page');
		}

	});

	var EduuView = Backbone.View.extend({

		//bind view to body element (all views should be bound to DOM elements)
		el: $('body'),

		//observe navigation click events and map to contained methods
		events: {
			'click img#start': 'start',
			'click ul.pills li.about-pill a': 'displayAbout',
			'click ul.pills li.contact-pill a': 'displayContact'
		},

		//called on instantiation
		initialize: function(){
			//set dependency on EduuRouter
			this.router = new EduuRouter();

			//call to begin monitoring uri and route changes
			Backbone.history.start();

			var award = new ArawdRecord();
			award.set({title:"test"});

			var awardList = new ArawdRecords();
			awardList.add(award);
			this.refreshAward(awardList);
		},

		start: function(){
			var cache = this;
	        //请求后端
	        img.start(function(){
	        	cache.router.navigate("result", true);
	        });
		},

		displayAbout: function(){
			//update url and pass true to execute route method
			this.router.navigate("about", true);
		},

		displayContact: function(){
			//update url and pass true to execute route method
			this.router.navigate("contact", true);
		},

		refreshAward: function(awardList){
			awardList.each(function(award){
				$("#result_record").append('<li>'+award.get("title")+'</li>')
			});
		}

	});

	//load application
	new EduuView();

	/**
	*	转盘程序
	*	2014.4.19 by zyh
	*/
	var img_src = "http://10.1.2.206:8181/style/img/lottery/turntable.png",
		awards = [
		    { id:1,name:"元宝100个",startAng:0,endAng:36,stopAng:342},
		    { id:8,name:"保温杯一个",startAng:36,endAng:72,stopAng:306},
		    { id:5,name:"学而思网校代金券20元",startAng:72,endAng:108,stopAng:270},
		    { id:7,name:"笔记本",startAng:108,endAng:144,stopAng:234},
		    { id:2,name:"元宝50个",startAng:144,endAng:180,stopAng:198},
		    { id:4,name:"学而思网校代金券10元",startAng:180,endAng:216,stopAng:162},
		    { id:9,name:"书包一个",startAng:216,endAng:252,stopAng:126},
		    { id:2,name:"元宝50个",startAng:252,endAng:288,stopAng:90},
		    { id:6,name:"学而思网校VIP年卡一张",startAng:288,endAng:324,stopAng:54},
		    { id:10,name:"小米手机一部",startAng:324,endAng:360,stopAng:18},
		    { id:11,name:"学而思网校代金券100元",startAng:180,endAng:216,stopAng:162}
		],
		ctx = turntable.getContext('2d'),	//canvas上下文
		random_award = null,	//随机奖品
		get_award_position = null,	//最后奖品位置
		is_get_award = false;	//是否得到奖品

	//简单的发布订阅模式，监听当前角度，和外部进行通信及操作
	var PubSub = { handlers : {}};
	PubSub.on = function(event,handler){
	    if(!(event in this.handlers)){
	        this.handlers[event] = [];
	    }
	    this.handlers[event].push(handler);

	    return this;
	}
	PubSub.emit = function(event){
	    var handlerArgs = Array.prototype.slice.call(arguments,1);
	    for (var i = 0; i < this.handlers[event].length; i++) {
	        this.handlers[event][i].apply(this,handlerArgs);
	    };
	    return this;
	}

	/**
	*   转盘主要代码段
	*/
	//抽奖图片canvas加载
	var img = new Image();
	img.src = img_src;
	img.onload = function () {
	    turntable.width = this.width << 1; 
	    turntable.height = this.height << 1;

	    //初始加载图片
	    ctx.save(); 
	    ctx.translate(this.width, this.height); 
	    ctx.drawImage(img, -turntable.width / 2, -turntable.height / 2, turntable.width, turntable.height);
	    ctx.restore();

	    var Controller=(function(cache){
	        var ang = 0;            //旋转角度
	        var ang_frequency = 10; //旋转角度增量
	        var fps = 5;            //旋转速度
	        var stop = false;       //是否停止旋转
	        var slow_down = false;  //是否减速开始
	        var frequency = 5;      //旋转增加频率
	        var get_award_position = 0; //减速位置
	        var circle_count = -1;   //旋转圈速
	        var callback = null;

	        function Turntable(){
	            ctx.save();
	            ctx.clearRect(0, 0, turntable.width, turntable.height); 
	            ctx.translate(img.width, img.height); 
	            ctx.rotate(Math.PI / 180 * (ang += ang_frequency)); 
	            ctx.drawImage(img, -turntable.width / 2, -turntable.height/2,turntable.width, turntable.height); 
	            ctx.restore();
	            if(ang % 360 < ang_frequency)circle_count++;
	            //订阅状态更改事件
	            PubSub.emit("now_state",
	            {
	                ang:ang,
	                slow_down:slow_down
	            });
	            !stop&&setTimeout(function(){ Turntable();},fps);
	        }
	        return {
	            start : function(callback){
	            	callback = callback;
	                Turntable();
	            },
	            stop : function(){
	                stop = true;
	                callback();
	            },
	            setSlowdown : function(){
	                slow_down = true;
	            },
	            getSlowdown : function(){
	                return slow_down;
	            },
	            setAngFrequency : function(param){
	                ang_frequency = param;
	            },
	            getAwardPosition : function(){
	                return ang;
	            },
	            getCircleCount : function(){
	                return circle_count;
	            }
	        };
	    })(this);

	    //发布状态更改事件
	    PubSub.on("now_state",function(state){
	        if(is_get_award){
	            var stop_position = get_award_position +(360 - get_award_position%360) + random_award.stopAng;   //停止位置

	            if(state.ang - stop_position > -60){
	                Controller.setAngFrequency(1);
	                if(state.ang - stop_position === 0){
	                    Controller.stop();
	                }
	            }
	        }
	    });

	    return this.start = function(callback){
	    	Controller.start(callback);
	        //请求后端
	        $.get("/event/wangxiao/go",{ cid : 0},function(data){
	            random_award = awards[~~(Math.random()*10)];    //得到奖品
		        is_get_award = true;
		        get_award_position = Controller.getAwardPosition();
	        });
	    }
	};
});
