/*TODO: get by date*/
var NOVA = function(){
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
        EXAMPLE_ERROR: 1
    };
    NovaError.prototype.errMessages = {
        1: "Det här är ett exempelfel."
    };
    
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
        this.nr = obj.nr || null;
    };
    Week.prototype.toXML = function(ignoreStart){};
    Week.prototype.toICS = function(ignoreStart){};
    Week.prototype.toJSON = function(){};
    Week.prototype.getDay = function(){};
    
    var Day = function(obj){
        this.date = obj.date || null,
            this.name = obj.name || null;
    };
    Day.prototype.toXML = function(ignoreStart){};
    Day.prototype.toICS = function(ignoreStart){};
    Day.prototype.toJSON = function(){};
    Day.prototype.getLessonAtTime = function(){/*Low prority*/};
    
    var Lesson = function(){};
    
    return {loadPDF:loadPDF, loadNovaPDF:loadNovaPDF}
}();

