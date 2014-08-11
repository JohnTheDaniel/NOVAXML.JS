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

