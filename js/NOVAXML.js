/*TODO: get by date*/
var NOVA = function(){
    
<<<<<<< HEAD
    //Every school has a different value. For example, Blackebergs Gymnasium has the id 52550
    var SCHOOLS = {
        "Blackebergs Gymnasium": 52550,
        "Kungsholmens Gymnasium": 29200,
        "Norra Real": 81530,
        "Östra Real": 59150
    };
=======
    var PROGRESS_STEPS = {getPdf:['Document Recived',
                                  'Page Loaded',
                                  'Done Loading'
                             ],
                          analyse:['Data Processed',
                                   'Week created'
                                  ],
                          combined:['Initiating Week',
                                    'Week Aplied'
                                   ]
                         };
    var FIRST_WEEK = 1,
        LAST_WEEK = 52,
        DENIED_WEEKS = [25,26,27,28,29,30,31,32,33];
>>>>>>> analysis
/****************************************************/
/******************** Analysis **********************/
/****************************************************/
    var loadPDF = function(loc,scale,progressFn) {
        var promise = new Promise(function(resolve,reject){
            if (typeof PDFJS === 'undefined') {
                reject(new Error('Built version of pdf.js is not found\nPlease run `node make generic`'));
            }
            
            PDFJS.getDocument(loc).then(function(pdf) {
                progressFn({step:0,string:PROGRESS_STEPS.getPdf[0]});
                pdf.getPage(1).then(function(page) {
                    progressFn({step:1,string:PROGRESS_STEPS.getPdf[1]});
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
                        progressFn({step:2,string:PROGRESS_STEPS.getPdf[2]});
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
            return 'php/phpProxy.php?id='+locObj.id+'&week='+locObj.week+'&school='+locObj.schoolId;
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
        var timeCheck = [];
        
        var lesson /*= {start:'',stop:'',contains:[]}*/,
            lessons = new Day(sortDayData(day.day.str));
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
            
        };
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
        INVALID_DATA: 6
    };
    NovaError.prototype.errMessages = {
        1: 'Unexpected error',
        2: 'Missing parameter',
        3: 'Wrong type',
        4: 'Unexpected structure',
        5: 'Denied parameter',
        6: 'Invalid data'
    };
    NovaError.prototype.toString = function(){return '[object NovaError]'};
    
    var Schdule = function(obj){
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
    Schdule.prototype.getWeeks = function(){/*Konstruera weekBasket och return*/};
    Schdule.prototype.loadWeeks = function(obj){
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
                    progressFn({weekNr:curr,stepType:'combined',step:0,string:PROGRESS_STEPS.combined[0]});

                    var load = t.loadWeek({nr:curr,id:id,schoolId:schoolId,scale:scale,progressFn:progressFn});
                    load.then(function(e){
                        progressFn({weekNr:e,stepType:'combined',step:1,string:PROGRESS_STEPS.combined[1],data:e,succeded:true});
                        if(--completed<1){
                            if(failed.length>0) reject(failed);
                            else resolve(t);
                        }
                    },function(err){
                        progressFn({weekNr:curr,stepType:'combined',step:1,string:PROGRESS_STEPS.combined[1],data:err,succeded:false});
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
    Schdule.prototype.loadWeek = function(obj,progressFn){
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
                    if(progress)progress({weekNr:nr,stepType:'analyse',step:0,string:PROGRESS_STEPS.analyse[0]});
                    week = processWeek(sort);
                    week.nr = nr;
                    if(progress)progress({weekNr:nr,stepType:'analyse',step:1,string:PROGRESS_STEPS.analyse[1]});
                    t.appendWeek(week);
                    resolve({weekNr:nr,week:week,viewport:objs.viewport,page:objs.page,textContent:objs.textContent})
                }catch(err){
                    /*Analyzing error and resolve it here*/
                    reject({error:err,weekNr:nr})
                }
            },function(err){reject(err)});
        });
        return promise
    };
    Schdule.prototype.appendWeek = function(week){
        if(!week)throw new NovaError({errCode:NovaError.prototype.errCodes.MISSING_PARAMETER,msg:'week is not defined'});
        //control Week constructor. Must be Week!
        week.parent = this;
        this.weeks.push(week);
    };
    
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
        xml = xml + "<novaschedule>";
        
        //something
        
        //Stop
        xml = xml + "</novaschedule>";
        
        return xml;
    };
    WeekBascet.prototype.toICS = function(){};
    WeekBascet.prototype.toJSON = function(){};
    
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
        if(!lesson)throw new NovaError({errCode:NovaError.prototype.errCodes.MISSING_PARAMETER,msg:'lesson is not defined'});
        //control Lesson constructor. Must be Lesson!
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
    
    
<<<<<<< HEAD
    return {SCHOOLS:SCHOOLS, getSortedDays:getSortedDays, loadPDF:loadPDF, getNovaUrl:getNovaUrl, processWeek:processWeek}
}();
=======
    return {Schdule:Schdule}
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
>>>>>>> analysis
