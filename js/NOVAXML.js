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
        
        WRONG_PARAMS_WEEKBASCET: 101,       
        WEEKBASCET_EMPTY: 102,
        
        INFINITE_LESSON: 401
    };
    NovaError.prototype.errMessages = {
        1: "Det här är ett exempelfel.",
        
        101: "Wrong params for WeekBascet. Must supply either {start: [integer], end: [integer]} or an array with integers with the desired week numbers, for example [3,5,7] wich returns week 3, week 5 and week 7",
        
        102: "WeekBascet is empty. Call NOVA.Schedule.getWeeks(params) to get a filled WeekBascet.",
        
        401: "Lesson lacks either a start or stop time. Make sure to set Lesson.startTime and Lesson.stopTime."
    };
    
    var Schdule = function(obj){
        this.schoolId = obj.schoolId || null,
            this.id = obj.id || null,
            this.weeks = [];
        
        if(obj.JSON)/*Convert JSON to new object*/;
    };
    Schdule.prototype.getWeeks = function(obj){
        /*Konstruera weekBasket och return*/
        var type = Object.prototype.toString.call(obj);
        var weekBascet = new WeekBascet();
        if(type=='[object Array]'){
            //Find the weeks in schedule.weeks that has the same week numbers as the typed values in the array.
            for(var i = 0; i < obj.length; i++){
                if (parseInt(obj[i]) === "NaN") {
                    throw new NovaError({errCode: NovaError.prototype.errCodes.WRONG_PARAMS_WEEKBASCET})
                };
                
                
                for(var a = 0; a < this.weeks.length; a++){
                    if((parseInt(obj[i])) === (parseInt(this.weeks[a].weekNumber))){
                        weekBascet.push(this.weeks[a]);
                    }
                }
            }
        } else if(obj.start && obj.stop){
            if((isNaN(obj.start)) || isNaN(obj.stop)) throw new NovaError({errCode: NovaError.prototype.errCodes.WRONG_PARAMS_WEEKBASCET});
            
            for(var i = obj.start; i <= obj.stop; i++){
                for(var a = 0; a < this.weeks.length; a++){
                    if(i === (parseInt(this.weeks[a].weekNumber))){
                        weekBascet.push(this.weeks[a]);
                    }
                }
            }
        }
        return weekBascet;
    };
    Schdule.prototype.loadWeeks = function(){/*Loop this.loadWeek()*/};
    Schdule.prototype.loadWeek = function(){/*Call hidden functions for analysis and appendWeek(), return promise*/};
    Schdule.prototype.appendWeek = function(week){this.weeks.push(week)};
    
    var WeekBascet = function(){/*Hold array of selected weeks from Schedule.getWeeks()*/};
    WeekBascet.prototype = new Array();
    WeekBascet.prototype.toXML = function(){     
        if(this.length === 0) {throw new NovaError({errCode: NovaError.errCodes.WEEKBASCET_EMPTY})}
        var xml = "";
        
        this.sort(function(a,b){
            return parseInt(a.weekNumber) - parseInt(b.weekNumber)      
        });
        
        //init xml
        xml = xml + BEGIN_XML;
        
        //Get xml from weeks.
        var xmlFromWeeks = "";
        for(var i = 0; i < this.length; i++){
            xmlFromWeeks = xmlFromWeeks + this[i].toXML(true);
        }
        xml = xml + xmlFromWeeks;
        
        //Stop
        xml = xml + END_XML;
        
        return xml;
    };
    WeekBascet.prototype.toICS = function(){};
    WeekBascet.prototype.toJSON = function(){};
    
    var Week = function(obj){
        //Must supply week number
        if(typeof obj.weekNumber === 'undefined') {throw new NovaError({errCode: NovaError.prototype.errCodes.EXAMPLE_ERROR})}
        else {this.weekNumber = parseInt(obj.weekNumber)}
        this.days = [];
    };
    Week.prototype.toXML = function(ignoreStart){
                
        //Sort days, just in case 
        this.days.sort(function(a,b){
            var aWeekDay;
            if(typeof a.weekDay === 'string') {aWeekDay = parseInt(a.weekDay)}
            else {aWeekDay = a.weekDay}
            
            var bWeekDay;
            if(typeof b.weekDay === 'string') {bWeekDay = parseInt(b.weekDay)}
            else {bWeekDay = b.weekDay}
            
            return aWeekDay - bWeekDay;
        });
        
        //Build xml
        var xml = "";
        if(!ignoreStart) xml = xml + BEGIN_XML;
        
        //header tag
        xml = xml + "<week number='" + this.weekNumber + "'>"
        
        //Place in all of the days
        var xmlFromDays = "";
        for(var i = 0; i < this.days.length; i++){
            xmlFromDays = xmlFromDays + this.days[i].toXML(true);
        }
        xml = xml + xmlFromDays;
        
        //Close it all up
        xml = xml + "</week>"
        if(!ignoreStart) xml = xml + END_XML;
        return xml;
        
    };
    Week.prototype.toICS = function(ignoreStart){};
    Week.prototype.toJSON = function(){};
    Week.prototype.getDay = function(){};
    Week.prototype.appendDay = function(day){this.days.push(day)};
    
    var Day = function(obj){
<<<<<<< HEAD
        if(obj.weekDay == null){
            //Must supply weekday.
            throw new NovaError({errCode: NovaError.prototype.errCodes.EXAMPLE_ERROR});          
        } else {
            this.weekDay = obj.weekDay;
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
        xml = xml + " week_day='" + this.weekDay + "'";
        if(this.date) xml = xml + " date='" + this.date + "'";
        xml = xml + ">"
        
        //Place xml of the lessons in the day
        var xmlFromLessons = "";
        for(var i = 0; i < this.lessons.length; i++){
            xmlFromLessons = xmlFromLessons + this.lessons[i].toXML(true);           
        }
        xml = xml + xmlFromLessons;
        
        //Close stuff up
        if(!ignoreStart) xml = xml + END_XML;
        xml = xml + "</day>"
        
        return xml;
    };
    Day.prototype.appendLesson = function(lesson){
        if(!lesson)throw 'missing parameter';
        lesson.parent = this;
        this.lessons.push(lesson);
    };
    Day.prototype.toICS = function(ignoreStart){};
    Day.prototype.toJSON = function(){};
    Day.prototype.appendLesson = function(lesson){this.lessons.push(lesson)};
    Day.prototype.getLessonAtTime = function(){/*Low prority*/};
    
    var Lesson = function(obj){
        if(!obj)obj = {};
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
