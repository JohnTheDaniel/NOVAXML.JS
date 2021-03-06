/*
 * NOVAXML.js -- analyzing noveschem pdfs through the use of PDF.js and phpProxy
 *
 * Copyright (C) 2014 akaProxy
 *                    Author: Erik Nygren <erik@nygrens.eu>
 *                            John Daniel Bossér <daniel@bosser.com>
 *
 * This file may be used under the terms of the MIT Licence
 * which can be found in the project root
 */


/*TODO: get by date*/
var NOVA = function(){
    
    /****************************************************/
    /******************* Constants **********************/
    /****************************************************/
    
    //Every school has a different value. For example, Blackebergs Gymnasium has the id 52550
    var SCHOOLS = {"Blackebergs Gymnasium": 52550,
                   "Kungsholmens Gymnasium": 29200,
                   "Norra Real": 81530,
                   "Östra Real": 59150
                  };
    var TYPES = {xml: "XML (for apps)", ics: "ICS (for calendars)", json: "JSON (coming soon)"};
    var PROGRESS_STEPS = {getPdf:['Document Received',
                                  'Page Loaded',
                                  'Done Loading'
                             ],
                          analyse:['Data Processed',
                                   'Week created'
                                  ],
                          combined:['Initiating Week',
                                    'Week Applied'
                                   ]
                         };
    var FIRST_WEEK = 1,
        LAST_WEEK = 52,
        DENIED_WEEKS = [25,26,27,28,29,30,31,32,33];
    
    var ICS_BEGINING = 'BEGIN:VCALENDAR\n'+
                       'PRODID:-//akaProxy//NOVAMINER public Beta//EN\n'+
                       'VERSION:2.0\n'+
                       'X-WR-CALNAME:Schema\n'+
                       'X-WR-CALDESC:Skolschema genererat av Novaminers\n' +
                       'X-WR-TIMEZONE:Europe/Stockholm\n' +
                       'BEGIN:VTIMEZONE\n' +
                       'TZID:Europe/Stockholm\n' +
                       'X-LIC-LOCATION:Europe/Stockholm\n' +
                       'BEGIN:DAYLIGHT\n' +
                       'TZOFFSETFROM:+0100\n' +
                       'TZOFFSETTO:+0200\n' +
                       'TZNAME:CEST\n' +
                       'DTSTART:19700329T020000\n' +
                       'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\n' +
                       'END:DAYLIGHT\n' +
                       'BEGIN:STANDARD\n' +
                       'TZOFFSETFROM:+0200\n' +
                       'TZOFFSETTO:+0100\n' +
                       'TZNAME:CET\n' +
                       'DTSTART:19701025T030000\n' +
                       'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\n' +
                       'END:STANDARD\n' +
                       'END:VTIMEZONE\n',
        ICS_END = 'END:VCALENDAR';
    var BASE_URL = ['php/phpProxy.php?id=','&week=','&school=',''];
    var BEGIN_XML = "<?xml version='1.0' encoding='UTF-8'?><novaschedule>";
    var END_XML = "</novaschedule>";
    
/****************************************************/
/******************** Analysis **********************/
/****************************************************/
    
    var loadPDF = function(loc,scale,progressFn) {
        var promise = new Promise(function(resolve,reject){
            if (typeof PDFJS === 'undefined') {
                reject(new Error('Built version of pdf.js is not found\nPlease run `node make generic`'));
            }
            
            PDFJS.getDocument(loc).then(function(pdf) {
                if(progressFn)progressFn({step:0,string:PROGRESS_STEPS.getPdf[0]});
                pdf.getPage(1).then(function(page) {
                    if(progressFn)progressFn({step:1,string:PROGRESS_STEPS.getPdf[1]});
                    var viewport;
                    /*scale handler*/
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
                        if(progressFn)progressFn({step:2,string:PROGRESS_STEPS.getPdf[2]});
                        resolve({page:page,viewport:viewport,textContent:textContent});
                    },function(err){reject(err)});
                },function(err){reject(err)});
            },function(err){reject(err)});
        });
        return promise
    };
    var loadNovaPDF = function(locObj,scale){
        if(locObj.schoolId && locObj.id && locObj.week)
            return loadPDF(getNovaUrl(locObj),scale);
    };
    var getNovaUrl = function(locObj){
        if(locObj.schoolId && locObj.id && locObj.week)
            return BASE_URL[0]+locObj.id+BASE_URL[1]+locObj.week+BASE_URL[2]+locObj.schoolId+BASE_URL[3];
        else throw new NovaError({errCode:NovaError.prototype.errCodes.MISSING_PARAMETER,msg:'can\'t build URL'});
    };
    
    var extractDays = function(textContent){
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
        return sortDays(extractDays(textContent));
    };
    
    var processDay = function(day,sorted){
        if(!(day.children && day.day) || Object.prototype.toString.call(day.children)!=='[object Array]')throw new NovaError({errCode:NovaError.prototype.errCodes.WRONG_TYPE,msg:'expected [object Array]'});
        
        if(!sorted)day.children.sort(function(a,b){
            var ret = b.transform[5]-a.transform[5];
            if(ret==0)ret = a.transform[4]-b.transform[4];
            return ret
        });
        
        //Make sure only contains two time columns
        var timeCheck = [],
            dayData = sortDayData(day.day.str);
        
        var lesson /*= {start:'',stop:'',contains:[]}*/,
            lessons = new Day(dayData);
        try{
            for(var i=0;i<day.children.length;i++){
                var t = isTime(day.children[i].str);
                if(t){
                    if(timeCheck.indexOf(day.children[i].transform[4])===-1)timeCheck.push(day.children[i].transform[4]);

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
            }
        }catch(err){
            //Remove this after sophisticated analyze created
            console.warn('An error occured when processing day, leaving it empty!');
            dayData.error = err;
            return new Day(dayData);
        }
        //if not two time columns -> throw
        if(timeCheck.length!==2)throw new NovaError({errCode:NovaError.prototype.errCodes.UNEXPECTED_STRUCTURE,msg:'incorect amount of time-columns: '+timeCheck.length, data:'Incomplete Day'});
        return lessons
    };
    var sortLessonData = function(data){
        if(!data || !(data.data && data.start && data.stop))throw new NovaError({errCode:NovaError.prototype.errCodes.MISSING_PARAMETER,msg:'either undefined or missing data, start, or stop'});
        var course,
            teacher,
            room;
        
        if(typeof data.data === 'string' || data.data.length == 1){
            course = data.data[0];
        }else if(data.data.length == 3){
            course = data.data[0];
            teacher = data.data[1];
            room = data.data[2];
        }else{
            throw new NovaError({errCode:NovaError.prototype.errCodes.UNEXPECTED_STRUCTURE,msg:'Lesson data not recognized',data:data.data});
        }
        
        return {startTime:data.start,stopTime:data.stop,course:course,teacher:teacher,room:room}
    };
    var sortDayData = function(data){
        if(typeof data !== 'string')throw new NovaError({errCode:NovaError.prototype.errCodes.WRONG_TYPE,msg:'expected string'});
        
        var date = data.match(/\d{1,2}\/\d{1,2}/),
            str = data.replace(/(\s+|^)(\d{1,2}\/\d{1,2})(\s+|$)/,'');
        
        if(str===data)throw 'No change in data';
        return {date:date[0],name:str}
    };
    var isTime = function(data){
        if(typeof data !== 'string')throw new NovaError({errCode:NovaError.prototype.errCodes.WRONG_TYPE,msg:'expected string'});
        
        var match = data.match(/\d\d:\d\d/g);
        var strict = data.match(/^\d\d:\d\d$/g);
        
        if(strict)return strict[0];
        if(match)throw ('Unrecognized time value' + data);
        return null
    };
    
    var processWeek = function(arr, nr){
        if(Object.prototype.toString.call(arr)!=='[object Array]' || arr.length!=5)throw new NovaError({errCode:NovaError.prototype.errCodes.WRONG_TYPE,msg:'expected array'});
        
        var week = new Week();
        if(parseInt(nr)===nr)week.nr=nr;
        //if(nr) will allow week nr to be undefined
        else if(nr) throw new NovaError({errCode:NovaError.prototype.errCodes.WRONG_TYPE,msg:'expected int'});
        
        for(var i=0;i<arr.length;i++){
            try {
                week.appendDay(processDay(arr[i]),i);
            }
            catch(err){
                if(err.errCode && err.errCode == NovaError.prototype.errCodes.UNEXPECTED_STRUCTURE && err.data == 'Incomplete Day')console.warn('No adv Day processing available. Skipping Day:'+i+' Week:'+nr);
                //either handle wrong day or pass down the error
                else throw err;
            }
        }
        return week
    };
/****************************************************/
/****************** Constructors ********************/
/****************************************************/
    
    var NovaError = function NovaError(obj) {
        if(typeof obj == 'string')
            this.message = obj;
        if(obj.errCode){
            this.message = this.errMessages[obj.errCode];
            this.errCode = obj.errCode;
        }
        if(obj.msg && typeof obj.msg == 'string')
            this.description = obj.msg;
        if(obj.data)this.data = obj.data;
        
        this.error = new Error(this.message+'; '+this.description);
    };
    NovaError.prototype.errCodes = {
        UNEXPECTED_ERROR: 1,
        MISSING_PARAMETER: 2,
        WRONG_TYPE: 3,
        UNEXPECTED_STRUCTURE: 4,
        DENIED_PARAMETER: 5,
        INVALID_DATA: 6,
        
        WRONG_PARAMS_WEEKBASCET: 101,       
        WEEKBASCET_EMPTY: 102,
        
        WEEK_NUMBER_MISSING: 201,
        
        WEEKDAY_NOT_SPECIFIED: 301,
        
        INFINITE_LESSON: 401,
        COURSE_NOT_SPECIFIED: 402
    };
    NovaError.prototype.errMessages = {
        1: 'Unexpected error',
        2: 'Missing parameter',
        3: 'Wrong type',
        4: 'Unexpected structure',
        5: 'Denied parameter',
        6: 'Invalid data',
        
        101: "Wrong params for WeekBascet. Must supply either {start: [integer], end: [integer]} or an array with integers with the desired week numbers, for example [3,5,7] wich returns week 3, week 5 and week 7",
        
        102: "WeekBascet is empty. Call NOVA.Schedule.getWeeks(params) to get a filled WeekBascet.",
        
        201: "Week number not specified. Pleace provide weekNumber in the param-object: Week({weekNumber:[integer]})",
        
        301: "Week day not specified. Pleace provide weekDay in the param-object: Day({weekDay:[integer 0 to 5]})", 
        
        401: "Lesson lacks either a start or stop time. Make sure to set Lesson.startTime and Lesson.stopTime.",
        
        402: "Lesson lacks a course name. Please provide a param with an object that specifies the course, example Lesson({course:'course name'})"
    };
    NovaError.prototype.toString = function(){return '[object NovaError]'};
    
    var Schedule = function(obj){
        if(!obj)obj = {};//prevent errors at undefined obj
        this.schoolId = obj.schoolId || null,
            this.id = obj.id || null
            this.weeks = [];
        
        if(obj.JSON)/*Convert JSON to new object*/;
    };
    var weekDataToArray = function(data){
        if(!data)throw new NovaError({errCode:NovaError.prototype.errCodes.MISSING_PARAMETER,msg:'Week-data not defined'});
        
        if(toString.call(data)==='[object Array]'){
            var ret = [];
            for(var i=0;i<data.length;i++){
                var c = parseInt(data[i]);
                if(!isNaN(c)){
                    if(DENIED_WEEKS.indexOf(c)===-1)
                        ret.push(c);
                    else
                        console.warn('Skipping week '+c+'; Week Denied');
                }else{
                    console.warn('Not number:'+c+'.\nSkipping value');
                }
            }
            return ret
        }else if(!isNaN(parseInt(data))){
            if(DENIED_WEEKS.indexOf(parseInt(data))!==-1)
                throw new NovaError({errCode:NovaError.prototype.errCodes.DENIED_PARAMETER,msg:'Week '+parseInt(data)+' is not allowed'});
            return [parseInt(data)];
        }else{
            var start = data.start || data.first,
                stop = data.stop || data.last || data.end;
            var s = parseInt(start),
                e = parseInt(stop);
            if(!(isNaN(s) || isNaN(e)) && s<e && s>=FIRST_WEEK && e<=LAST_WEEK){
                var ret = [];
                for(;s<=e;s++){
                    if(DENIED_WEEKS.indexOf(s)===-1)
                        ret.push(s);
                    else
                        console.warn('Skipping week '+s+'; Week Denied');
                }
                return ret
            }else{
                throw new NovaError({errCode:NovaError.prototype.errCodes.DENIED_PARAMETER,
                                     msg:'First or last week is not allowed or wrong',
                                     data:{first:start,last:stop}});
            }
        }
    };
    Schedule.prototype.getWeeks = function(obj){
        if(obj && obj=='all'){
            obj=[];
            for(var i=0;i<this.weeks.length;i++){
                obj.push(this.weeks[i].nr);
            }
        }
        return new WeekBascet(weekDataToArray(obj),this.weeks);
    };
    Schedule.prototype.loadWeeks = function(obj){
        var id = obj.id,
            schoolId = obj.schoolId,
            scale = obj.scale,
            urlArr = obj.url || null,
            pdfDataArr = obj.pdf || obj.pdfData,
            progressFn = obj.progressFn || null,
            weeks;
        
        if(toString.call(pdfDataArr)==='[object Array]')
            weeks = pdfDataArr,
                pdfDataArr = true;
        else pdfDataArr = false;
        if(toString.call(urlArr)==='[object Array]')
            weeks = urlArr,
                urlArr = true;
        else urlArr = false;
        
        if(!(pdfDataArr || urlArr))
            weeks = weekDataToArray(obj.weeks || obj.week);
        
        //to reach this in async functions
        var t = this;
        
        var promise = new Promise(function(resolve,reject){
            var completed = weeks.length,
                failed = [];
            for(var i=0;i<weeks.length;i++){
                var curr = weeks[i];

                if(pdfDataArr)
                    t.loadWeek({nr:i,pdf:curr,scale:scale,progressFn:progressFn});
                else if(urlArr)
                    t.loadWeek({nr:i,pdf:curr,scale:scale,progressFn:progressFn});
                else{
                    if(progressFn)progressFn({weekNr:curr,stepType:'combined',step:0,string:PROGRESS_STEPS.combined[0]});

                    t.loadWeek({nr:curr,id:id,schoolId:schoolId,scale:scale,progressFn:progressFn}).then(function(e){
                        if(progressFn)progressFn({weekNr:e.weekNr,stepType:'combined',step:1,string:PROGRESS_STEPS.combined[1],data:e,succeded:true});
                        if(--completed<1){
                            if(failed.length>0) reject(failed);
                            else resolve(t);
                        }
                    },function(err){
                        if(progressFn)progressFn({weekNr:err.weekNr,stepType:'combined',step:1,string:PROGRESS_STEPS.combined[1],data:err,succeded:false});
                        failed.push(err);
                        if(--completed<1){
                            if(failed.length>0) reject(failed);
                            else resolve(t);
                        }
                    });
                }
            }
        });
        return promise
    };
    Schedule.prototype.loadWeek = function(obj,progressFn){
        var nr = parseInt(obj),
            id = this.id,
            schoolId = this.schoolId,
            progress = progressFn || null,
            scale,
            url;
        
        if(isNaN(nr)){
            nr=obj.nr
            if(!nr)throw new NovaError({errCode:NovaError.prototype.errCodes.MISSING_PARAMETER,msg:'Week nr not specified'});
            
            if(obj.schoolId)schoolId = obj.schoolId;
            if(obj.id)id = obj.id;
            if(!(schoolId && id))throw new NovaError({errCode:NovaError.prototype.errCodes.MISSING_PARAMETER,
                                                      msg:'id and schoolId must be specified either in the Schedule object or  as a parameter'});
            
            scale = obj.scale || null;
            if(obj.progressFn)progress = obj.progressFn;
        }
        //Control data TODO: enable after merge
        /*if(SCHOOLS.indexOf(schoolId)===-1)
           throw new NovaError({errCode:NovaError.prototype.errCodes.INVALID_DATA,msg:'used schoolId that is not indexed',data:schoolId});*/
        
        if(obj.pdf || obj.url)url = obj.pdf || obj.url;
        else url = getNovaUrl({schoolId:schoolId,id:id,week:nr});
        
        //to reach this in async functions
        var t = this;
        var promise = new Promise(function(resolve, reject){
            loadPDF(url,scale,function(e){if(progress)progress({weekNr:nr,stepType:'getPdf',step:e.step,string:e.string});}).then(function(objs){
                var week;
                try{
                    var sort = getSortedDays(objs.textContent);
                    if(progress)progress({weekNr:nr,stepType:'analyse',step:0,string:PROGRESS_STEPS.analyse[0],viewport:objs.viewport,page:objs.page});
                    week = processWeek(sort);
                    week.nr = nr;
                    if(progress)progress({weekNr:nr,stepType:'analyse',step:1,string:PROGRESS_STEPS.analyse[1]});
                    t.appendWeek(week);
                    resolve({weekNr:nr,week:week,viewport:objs.viewport,page:objs.page,textContent:objs.textContent});
                }catch(err){
                    /*Analyzing error and resolve it here*/
                    reject({error:err,weekNr:nr})
                }
                 resolve({weekNr:nr,week:week,viewport:objs.viewport,page:objs.page,textContent:objs.textContent});
            },function(err){reject(err)});
        });
        return promise
    };
    Schedule.prototype.appendWeek = function(week){
        if(!week)throw new NovaError({errCode:NovaError.prototype.errCodes.MISSING_PARAMETER,msg:'week is not defined'});
        //control Week constructor. Must be Week!
        week.parent = this;
        this.weeks.push(week);
    };
    
    var WeekBascet = function(arr,weeks){/*Construct array of selected weeks*/
        if(Object.prototype.toString.call(arr)!=='[object Array]')
            throw new NovaError({errCode:NovaError.prototype.errCodes.WRONG_TYPE,msg:'expected [object Array]'});
        var weekNrs = [];
        for(var i=0;i<weeks.length;i++)
            weekNrs.push(weeks[i].nr);
        
        arr.sort();
        for(var i=0;i<arr.length;i++){
            var c = parseInt(arr[i]);
            if(isNaN(c))console.warn('invalid week number, skipping');
            var index = weekNrs.indexOf(c);
            if(index!==-1)
                this.push(weeks[index]);
        }
        //return new Array()//inherit array
    };
    WeekBascet.prototype = new Array();
    WeekBascet.prototype.toXML = function(){
        if(this.length === 0) {throw new NovaError({errCode: NovaError.errCodes.WEEKBASCET_EMPTY})}
        var xml = "";
        
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
    var getCurrentDate = function(onlyDate){
        var h = new Date();
        var yr = h.getFullYear().toString();
        var month = h.getMonth().toString();
        if(month.length==1)month='0'+month;
        
        if(onlyDate=='year'){
            if(parseInt(month)<7)
                return [parseInt(yr),parseInt(yr)-1];
            else
                return [parseInt(yr)+1,parseInt(yr)];
        }
        
        var day = h.getDate().toString();
        if(day.length==1)day='0'+day;
 
        var hour = h.getHours().toString();
        if(hour.length==1)hour='0'+hour;
        var min = h.getMinutes().toString();
        if(min.length==1)min='0'+min;
        var sec = h.getSeconds().toString();
        if(sec.length==1)sec='0'+sec;
 
        var ret =  yr+month+day+'T';
        if(!onlyDate)return ret+hour+min+sec+'Z';
        return ret
    }
    WeekBascet.prototype.toICS = function(maxLength, baseId){
        //maxLength, gives an option to split the ics strings every [maxLength] week.
        //It will always keep weeks in same string
        var ics = [ICS_BEGINING],
            stop = {prev:0,index:0},
            yr = getCurrentDate('year'),
            today = getCurrentDate();
        if(maxLength && isNaN(parseFloat(maxLength)) && parseFloat(maxLength)>=1)
            throw new NovaError({errCode:NovaError.prototype.errCodes.WRONG_TYPE,msg:'expected a Number greater than 1'});
        
        for(var i=0;i<this.length;i++){
            if(maxLength && stop.prev+maxLength<=i){
                stop.prev+=maxLength;
                ics[stop.index++]+=ICS_END;
                ics[stop.index]=ICS_BEGINING;
            }
            var id = null;
            if(baseId)id = baseId.toString()+(this[i].nr || i);
            ics[stop.index]+=this[i].toICS(true,yr,(id || this[i].nr || i),today);
        }
        ics[stop.index]+=ICS_END;
        
        if(ics.length==1)return ics[0];
        return ics
    };
    
    
    var Week = function(obj){
        if(!obj)obj = {};//prevent errors at undefined obj
        this.nr = obj.nr || null,
            this.parent = obj.parent || null,
            this.days = [];
    };
    Week.prototype.appendDay = function(day, id){
        if(!day)throw new NovaError({errCode:NovaError.prototype.errCodes.MISSING_PARAMETER,msg:'day is not defined'});
        //control Day constructor. Must be Day!
        day.parent = this;
        if(!day.weekDay){
            if(parseInt(id)==id)day.weekDay = id;
            else day.weekDay = this.days.length;
        }
        this.days.push(day);
    };
    Week.prototype.toXML = function(ignoreStart){                  
        //Sort days, just in case 
        this.days.sort(function(a,b){
            var aWeekDay;
            if(typeof a.nr === 'string') {aWeekDay = parseInt(a.nr)}
            else {aWeekDay = a.nr}
            
            var bWeekDay;
            if(typeof b.nr === 'string') {bWeekDay = parseInt(b.nr)}
            else {bWeekDay = b.nr}
            
            return aWeekDay - bWeekDay;
        });
        
        //Build xml
        var xml = "";
        if(!ignoreStart) xml = xml + BEGIN_XML;
        
        //header tag
        xml = xml + "<week number='" + this.nr + "'>"
        
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
    Week.prototype.toICS = function(ignoreStart,yearOverride,baseId,currentDate){
        var ics = '';
        if(baseId === true)baseId=this.nr;
        if(!ignoreStart)ics = ICS_BEGINING;
        
        for(var i=0;i<this.days.length;i++){
            var id;
            if(baseId)id=baseId.toString()+i;
            try{
                ics+=this.days[i].toICS(true,yearOverride,null,id,currentDate);
            }catch(err){
                //if wrong date calculate 
                console.warn('Error while parsing Day, skipping');
            }
        }
        if(!ignoreStart)ics += ICS_END;
        return ics
    };
    Week.prototype.toJSON = function(){};
    Week.prototype.getDay = function(){};
    
    var Day = function(obj){
        if(!obj)obj = {};//prevent errors at undefined obj
        this.date = obj.date || null,
            this.name = obj.name || null,
            this.weekDay = obj.weekDay || null,
            this.lessons = [];
        if(obj.error)
            this.error = obj.error;
    };
    Day.prototype.appendLesson = function(lesson){
        if(!lesson)throw new NovaError({errCode:NovaError.prototype.errCodes.MISSING_PARAMETER,msg:'lesson is not defined'});
        //control Lesson constructor. Must be Lesson!
        lesson.parent = this;
        this.lessons.push(lesson);
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
    Day.prototype.toICS = function(ignoreStart,yearOverride,dateOverride,baseId,currentDate){
        var getDate = function(d){
            if(d && d.match(/\d{1,2}\/\d{1,2}/g))
                return d.match(/\d{1,2}\/\d{1,2}/g)[0].split('/');
        }
        var date = getDate(dateOverride) || getDate(this.date) || null,
            year = yearOverride || getCurrentDate('year');
        if(!date)
            throw new NovaError({errCode:NovaError.prototype.errCodes.INVALID_DATA,msg:'don\'t understand date'});
        
        if(date[1]<8){//date[0]->day,date[1]->month,date[2]->year
            date.push(year[0])
        }else{
            date.push(year[1])
        }
        if(date[0].length==1)date[0]='0'+date[0];
        if(date[1].length==1)date[1]='0'+date[1];
        
        var ics = '';
        if(!ignoreStart)ics = ICS_BEGINING;
        
        for(var i=0;i<this.lessons.length;i++){
            var id;
            if(baseId)id=baseId.toString()+i;
            ics+=this.lessons[i].toICS(true,date,id,currentDate);
        }
        if(!ignoreStart)ics += ICS_END;
        return ics
    };
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
    Lesson.prototype.toICS = function(ignoreStart,date,idOverride,currentDate){
        var ics = '',
            currentDate = currentDate || getCurrentDate(),
            idOverride = idOverride || parseInt(Math.random()*100);
        if(!ignoreStart)
            ics = ICS_BEGINING;
        if(!(this.course && this.startTime && this.stopTime)){
            console.warn('Illegal lesson, skipping!');
            return '';
        }
        
        var e = this.stopTime.split(':'),
            s = this.startTime.split(':'),
            f;
        if(date && date[2])
            f = date[2]+date[1]+date[0]+'T';
        else f = getCurrentDate(true);//Should this be a throw
        
        //add error handling here
        
        ics+='BEGIN:VEVENT\n'+
             'UID:uid'+idOverride+'@example.com\n'+
             'SEQUENCE:0\n'+
             'DTSTAMP:'+currentDate+'\n'+
             'CREATED:'+currentDate+'\n'+
             'LAST-MODIFIED:'+currentDate+'\n'+
             'SUMMARY:'+this.course+'\n'+
             'DESCRIPTION:Teacher:'+this.teacher+'\n'+
             'LOCATION:'+this.room+'\n'+
             'DTSTART:'+f+s[0]+s[1]+'00\n'+
             'DTEND:'+f+e[0]+e[1]+'00\n'+
             'END:VEVENT\n';
        
        if(!ignoreStart)ics+=ICS_END;
        return ics
    };
    Lesson.prototype.toXML = function(ignoreStart){
        var xml = "";
        //Begin
        if(!ignoreStart) xml = xml + BEGIN_XML;
        xml = xml + "<lesson>";
        
        //Everything in the middle
        
        //Start time
        if(this.startTime === null) {
            return;
        } else {
            xml = xml + "<start>" + this.startTime + "</start>";   
        }
        
        //Stop time
        if(this.stopTime === null) {
            return;
        } else {
            xml = xml + "<stop>" + this.stopTime + "</stop>";   
        }
        
        //Course
        //TODO: do not render incorrectly if course does not exist. Schedule should be able to render without course.
        //However, a whole day cannot be rendered if a start time does not exist, that is the difference.
        if(this.course === null){
            //throw new NovaError({errCode: NovaError.prototype.errCodes.})
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
    
    return {TYPES:TYPES, SCHOOLS:SCHOOLS, Schedule:Schedule, editConstants: null}
}();
