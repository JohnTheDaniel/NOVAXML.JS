/*TODO: get by date*/
var NOVA = function(){
/****************************************************/
/******************* Constants **********************/
/****************************************************/
    
    var BEGIN_XML = "<novaschedule>";
    var END_XML = "</novaschedule>";
    
/****************************************************/
/******************** Analysis **********************/
/****************************************************/
    
    var loadPDF = function(loc,scale) {
        var promise = new Promise(function(resolve,reject){
            if (typeof PDFJS === 'undefined') {
                reject(new Error('Built version of pdf.js is not found\nPlease run `node make generic`'));
            }
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
    
/****************************************************/
/****************** Constructors ********************/
/****************************************************/
    
    var NovaError = function(obj) {
        if(typeof obj == "string")
            this.message = obj;
        if(obj.errCode){
            this.message = this.errMessages[obj.errCode];
            this.errCode = obj.errCode;
        }
    };
    NovaError.prototype.errCodes = {
        EXAMPLE_ERROR: 1,
        INFINITE_LESSON: 401
    };
    NovaError.prototype.errMessages = {
        1: "Det här är ett exempelfel.",
        
        401: "Lesson lacks either a start or stop time. Make sure to set Lesson.startTime and Lesson.stopTime."
    };
    
    var Schdule = function(obj){
        this.schoolId = obj.schoolId || null,
            this.id = obj.id || null,
            this.weeks = [];
        
        if(obj.JSON)/*Convert JSON to new object*/;
    };
    Schdule.prototype.getWeeks = function(){/*Konstruera weekBasket och return*/};
    Schdule.prototype.loadWeeks = function(){/*Loop this.loadWeek()*/};
    Schdule.prototype.loadWeek = function(){/*Call hidden functions for analysis and appendWeek(), return promise*/};
    Schdule.prototype.appendWeek = function(){/*Add week to week array*/};
    
    var WeekBascet = function(obj){/*Construct array of selected weeks*/
        var type = Object.prototype.toString.call(obj);
        if(type=='[object Array]'){
        }else if(obj.start && obj.end){
        }
        //return new Array()//inherit array
    };
    WeekBascet.prototype = new Array();
    WeekBascet.prototype.toXML = function(){
        if(this.length == 0) {throw new NovaError({errCode: NovaError.errCodes.EXAMPLE_ERROR})}
        var xml = "";
        
        //init xml
        xml = xml + BEGIN_XML;
        
        //something
        
        //Stop
        xml = xml + END_XML;
        
        return xml;
    };
    WeekBascet.prototype.toICS = function(){};
    WeekBascet.prototype.toJSON = function(){};
    
    var Week = function(obj){
        this.nr = obj.nr || null;
        this.days = [];
    };
    Week.prototype.toXML = function(ignoreStart){};
    Week.prototype.toICS = function(ignoreStart){};
    Week.prototype.toJSON = function(){};
    Week.prototype.getDay = function(){};
    Week.prototype.appendDay = function(day){this.days.push(day)};
    
    var Day = function(obj){
        if(obj.weekDay){
            this.weekDay = obj.weekDay;
        } else {
            //Must supply weekday.
            throw new NovaError({errCode: NovaError.prototype.errCodes.EXAMPLE_ERROR});
        }
        this.date = obj.date || null,
            this.name = obj.name || null,
            this.lessons = [];
        
    };
    Day.prototype.toXML = function(ignoreStart){
        //Sort lessons of the day.
        this.lessons.sort(function(a,b){
            var aTimes = a.startTime.split(":");
            var bTimes = b.startTime.split(":");
            
            var aHour = parseInt(aTimes[0]);
            var aMin = parseInt(aTimes[1]);
            
            var bHour = parseInt(bTimes[0]);
            var bMin = parseInt(bTimes[1]);
            
            if(aHour === bHour){
                return aMin-bMin;
            } else {
                return aHour - bHour;
            }
        });
        
        
        //Build xml
        var xml = "";
        //Begin
        if(!ignoreStart) xml = xml + BEGIN_XML;
        //First, top layer tag
        xml = xml + "<day";
        if(this.weekDay) xml = xml + " week_day='" + this.weekDay + "'";
        if(this.date) xml = xml + " date='" + this.date + "'";
        xml = xml + ">"
        
        //Place xml of the lessons in the day
        
        //Close stuff up
        if(!ignoreStart) xml = xml + END_XML;
        xml = xml + "</day>"
    };
    Day.prototype.toICS = function(ignoreStart){};
    Day.prototype.toJSON = function(){};
    Day.prototype.appendLesson = function(lesson){this.lessons.push(lesson)};
    Day.prototype.getLessonAtTime = function(){/*Low prority*/};
    
    var Lesson = function(obj){
        //Must supply start and stop time.
        if(!(obj.startTime || obj.stopTime)) throw new NovaError({errCode: NovaError.prototype.errCodes.INFINITE_LESSON});
        
        this.startTime = obj.startTime,
        this.stopTime = obj.stopTime,
        this.course = obj.course || null,
        this.teacher = obj.teacher || null,
        this.room = obj.room || null;
    };
    Lesson.prototype.toXML = function(ignoreStart){
        var xml = "";
        //Begin
        if(!ignoreStart) xml = xml + BEGIN_XML;
        xml = xml + "<lesson>";
        
        //Everything in the middle
        
        //Start time
        if(this.startTime === null) {
            throw new NovaError({errCode: NovaError.errCodes.EXAMPLE_ERROR})
        } else {
            xml = xml + "<start>" + this.startTime + "</start>";   
        }
        
        //Stop time
        if(this.stopTime === null) {
            throw new NovaError({errCode: NovaError.errCodes.EXAMPLE_ERROR})
        } else {
            xml = xml + "<stop>" + this.stopTime + "</stop>";   
        }
        
        //Course
        //TODO: do not render incorrectly if course does not exist. Schedule should be able to render without course.
        //However, a whole day cannot be rendered if a start time does not exist, that is the difference.
        if(this.course === null){
            throw new NovaError({errCode: NovaError.prototype.errCodes.EXAMPLE_ERROR})
        } else {
            xml = xml + "<course>" + this.course + "</course>";   
        }
        
        //Teacher
        xml = xml + "<teacher>";
        if(this.teacher != null) xml = xml + this.teacher;
        xml = xml + "</teacher>"
        
        //Room
        xml = xml + "<room>";
        if(this.room != null) xml = xml + this.room;
        xml = xml + "</room>"
        
        //End
        xml = xml + "</lesson>";
        if(!ignoreStart) xml = xml + END_XML;
        
        return xml;
    };
    Lesson.prototype.toICS = function(ignoreStart){};
    Lesson.prototype.toJSON = function(){};
    
    return {loadPDF:loadPDF, loadNovaPDF:loadNovaPDF}
}();

