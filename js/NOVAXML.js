/*TODO: get by date*/
var NOVA = function(){
/****************************************************/
/******************** Analysis **********************/
/****************************************************/
    var loadPDF = function(loc,scale) {
        if (typeof PDFJS === 'undefined') {
            alert('Built version of pdf.js is not found\nPlease run `node make generic`');
            return;
        }
        var promise = new Promise(function(resolve,reject){
            PDFJS.getDocument(loc).then(function(pdf) {
                pdf.getPage(1).then(function(page) {
                    var viewport;
                    /*scale handeler*/
                    if(!scale || !isNaN(parseFloat(scale))){
                        viewport = page.getViewport(scale||1);
                    }else if(scale.width || scale.height){
                        viewport = page.getViewport(1);
                        if(scale.width && scale.height){
                            if(scale.renderMode=='cover'){
                                viewport = page.getViewport(Math.max((scale.width/viewport.width),(scale.height/viewport.height)));
                            }else{//contain is default, therefore anything but 'cover'
                                viewport = page.getViewport(Math.min((scale.width/viewport.width),(scale.height/viewport.height)));
                            }
                        }else if(scale.width){
                            viewport = page.getViewport(scale.width/viewport.width);
                        }else if(scale.height){
                            viewport = page.getViewport(scale.height/viewport.height);
                        }
                    }
                    page.getTextContent().then(function(textContent) {
                        resolve({page:page,viewport:viewport,textContent:textContent});
                    },function(err){reject(err)});
                },function(err){reject(err)});
            },function(err){reject(err)});
        });
        return promise
    };
    var loadNovaPDF = function(locObj,scale){
        if(locObj.schoolId && locObj.id && locObj.week)
            return loadPDF('php/phpProxy.php?id='+locObj.id+'&week='+locObj.week+'&school='+locObj.schoolId,scale);
    };
    var getNovaUrl = function(locObj){
        if(locObj.schoolId && locObj.id && locObj.week)
            return 'php/phpProxy.php?id='+locObj.id+'&week='+locObj.week+'&school='+locObj.schoolId;
    };
    
    var extrctDays = function(textContent){
        textContent.items.sort(function(a,b){
            var ret = b.transform[5]-a.transform[5];
            if(ret==0)ret = a.transform[4]-b.transform[4];
            return ret
        });
        var days = [];
        for(var i=0;i<5;i++){
            days.push(textContent.items.splice(0,1)[0]);
        }
        return {textContent:textContent.items,days:days}
    };
    var sortDays = function(advTxtCont){
        var days = [];
        for(var i=0;i<advTxtCont.days.length;i++){
            advTxtCont.days[i].index=i;
            days.push({day:advTxtCont.days[i],children:[]});
        }
        for(var i=0;i<advTxtCont.textContent.length;i++){
            var text = advTxtCont.textContent[i];
            advTxtCont.days.sort(function(a,b){
                return Math.abs((a.transform[4]+a.width/2)-(text.transform[4]+text.width/2))-
                    Math.abs((b.transform[4]+b.width/2)-(text.transform[4]+text.width/2));
            });
            days[advTxtCont.days[0].index].children.push(text);
        }
        return days
    };
    var getSortedDays = function(textContent){
        return sortDays(extrctDays(textContent));
    };
    
    var processDay = function(day,sorted){
        if(!(day.children && day.day) || Object.prototype.toString.call(day.children)!=='[object Array]')throw 'Wrong type, expected [object Array]';
        
        if(!sorted)day.children.sort(function(a,b){
            var ret = b.transform[5]-a.transform[5];
            if(ret==0)ret = a.transform[4]-b.transform[4];
            return ret
        });
        
        var lesson /*= {start:'',stop:'',contains:[]}*/,
            lessons = new Day(sortDayData(day.day.str));
        for(var i=0;i<day.children.length;i++){
            var t = isTime(day.children[i].str);
            if(t){
                if(lesson){
                    var fill = sortLessonData({data:lesson.contains,start:lesson.start,stop:t});
                    var l = new Lesson(fill);
                    lessons.appendLesson(l);
                    lesson = null;
                }else{
                    lesson = {start:t/*,stop:null*/,contains:[]}
                }
            }else if(lesson){
                lesson.contains.push(day.children[i].str);
            }
            
        };
        
        return lessons
    };
    var sortLessonData = function(data){
        if(!data || !(data.data && data.start && data.start))throw 'missing parameter';
        var course,
            teacher,
            room;
        
        if(typeof data.data === 'string' || data.data.length == 1){
            course = data.data[0];
        }else if(data.data.length == 3){
            course = data.data[0];
            teacher = data.data[1];
            room = data.data[2];
        }
        
        return {startTime:data.start,stopTime:data.stop,course:course,teacher:teacher,room:room}
    };
    var sortDayData = function(data){
        if(typeof data !== 'string')throw 'Wrong type, expected string';
        
        var date = data.match(/\d{1,2}\/\d{1,2}/),
            str = data.replace(/(\s+|^)(\d{1,2}\/\d{1,2})(\s+|$)/,'');
        
        if(str===data)throw 'No change in data';
        return {date:date[0],name:str}
    };
    var isTime = function(data){
        if(typeof data !== 'string')throw 'Wrong type, expected string';
        
        var match = data.match(/\d\d:\d\d/g);
        var strict = data.match(/^\d\d:\d\d$/g);
        
        if(strict)return strict[0];
        if(match)throw ('Unrecognized time value' + data);
        return null
    };
/****************************************************/
/****************** Constructors ********************/
/****************************************************/
    
    var Schdule = function(obj){
        this.schoolId = obj.schoolId || null,
            this.id = obj.id || null;
        
        if(obj.JSON)/*Convert JSON to new object*/;
    };
    Schdule.prototype.getWeeks = function(){/*Konstruera weekBasket och return*/};
    Schdule.prototype.loadWeeks = function(){/*Loop this.loadWeek()*/};
    Schdule.prototype.loadWeek = function(){/*Call hidden functions for analysis and appendWeek()*/};
    Schdule.prototype.appendWeek = function(){/*Add week to week array*/};
    
    var WeekBascet = function(obj){/*Construct array of selected weeks*/
        var type = Object.prototype.toString.call(obj);
        if(type=='[object Array]'){
        }else if(obj.start && obj.end){
        }
        //return new Array()//inherit array
    };
    WeekBascet.prototype.toXML = function(){};
    WeekBascet.prototype.toICS = function(){};
    WeekBascet.prototype.toJSON = function(){};
    
    var Week = function(obj){
        this.nr = obj.nr || null;
    };
    Week.prototype.toXML = function(ignoreStart){};
    Week.prototype.toICS = function(ignoreStart){};
    Week.prototype.toJSON = function(){};
    Week.prototype.getDay = function(){};
    
    var Day = function(obj){
        if(!obj)obj = {};//prevent errors at undefined obj
        this.date = obj.date || null,
            this.name = obj.name || null,
            this.lessons = [];
    };
    Day.prototype.appendLesson = function(lesson){
        if(!lesson)throw 'missing parameter';
        lesson.parent = this;
        this.lessons.push(lesson);
    };
    Day.prototype.toXML = function(ignoreStart){};
    Day.prototype.toICS = function(ignoreStart){};
    Day.prototype.toJSON = function(){};
    Day.prototype.getLessonAtTime = function(){/*Low prority*/};
    
    var Lesson = function(obj){
        if(!obj)obj = {};//prevent errors at undefined obj
        this.startTime = obj.startTime || null,
            this.stopTime = obj.stopTime || null,
            this.course = obj.course || null,
            this.teacher = obj.teacher || null,
            this.room = obj.room || null,
            this.parent = obj.parent || null;
    };
    
    
    return {getSortedDays:getSortedDays, loadPDF:loadPDF, getNovaUrl:getNovaUrl, processDay:processDay}
}();


window.onload = function(){
    document.getElementById('NOVA-submit-btn').onclick = function(){
        //Disabled for development
        //var url = "php/phpProxy.php?id=" + id + "&week=" + week + "&school=" + schoolId;
        var url = NOVA.getNovaUrl({schoolId:52550,id:document.getElementById('NOVA-user-id').value,week:36});//"Schedule.pdf";

        NOVA.loadPDF(url,{width:window.innerWidth,height:500,renderMode:'contain'}).then(function(objs){
            var viewport = objs.viewport,
                page = objs.page,
                textContent = objs.textContent;

            var container = document.getElementById("pdfContainer");

            var canvas = document.createElement("canvas");
            var context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            container.appendChild(canvas);

            var renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            page.render(renderContext);
            
            window.h = NOVA.getSortedDays(textContent);
            console.log(h);

        }).catch(function(err){console.log(err)});

        return false
    };
};