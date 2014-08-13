var addForkMe = function(color,pos,size,parent,usrStyle){
    var gitForkMeMedia = {baseUri:'https://s3.amazonaws.com/github/ribbons/forkme_',
                          pos:{right:'right_',left:'left_'},
                          color:{white:'white_ffffff.png',
                                 gray:'gray_6d6d6d.png',
                                 darkblue:'darkblue_121621.png',
                                 red:'red_aa0000.png',
                                 green:'green_007200.png',
                                 orange:'orange_ff7600.png'},
                          link:'https://github.com/akaProxy/NOVAXML.JS',
                          randProp: function(obj){
                              var result;
                              var count = 0;
                              for (var prop in obj)
                                  if (Math.random() < 1/++count)
                                      result = prop;
                              return result;
                          }
                         };
    obj = gitForkMeMedia;
    if(!parent)
        parent=document.body;
    if(!color || color=='random')
        color = gitForkMeMedia.randProp(obj.color);
    if(pos=='random')
        pos = (Math.random()<0.5)?'left':'right';
    else if(pos!='right')
        pos='left';
    if(!size || size=='default')
        size='149px';

    var styles = {backgroundImage:'url("'+obj.baseUri+obj.pos[pos]+obj.color[color]+'")',
                    backgroundRepeat:'no-repeat',
                    backgroundSize:'cover',
                    position:'absolute',
                    zIndex:'100',
                    top:'0%',
                    right:'',
                    left:'',
                    width:size,
                    height:size
                };

    if(document.getElementById('ForkUsOnGit'))
        gitA=document.getElementById('ForkUsOnGit');
    else{
        var gitA = document.createElement('a'),
            href=document.createAttribute("href"),
            id=document.createAttribute("id");
        href.value=obj.link,
            id.value='ForkUsOnGit';
        gitA.setAttributeNode(href),
            gitA.setAttributeNode(id);
    }

    for(style in styles)
        gitA.style[style] = styles[style];
    for(style in usrStyle)
        gitA.style[style] = usrStyle[style];

    gitA.style[pos] = '0%'
    parent.appendChild(gitA);
};

var schoolList = function(){
    var element;
    var setup = function(schoolIds) {
        //Create select
        element = document.createElement("select");
        //selectSchool.id = id;
        //Create options and insert them into select
        for (var k in schoolIds){
            //Create option
            var option = document.createElement("option");
            option.textContent = k;
            option.value = schoolIds[k];

            //Insert option into select
            element.appendChild(option);
        }
        //insert select into DOM.
        return element
    }
    var getElement = function(){
        return element
    };
    return {setup:setup,getElement:getElement}
}();

var weekSelect = function(){
    var toggle = {string:'Avancerade alternativ',elmnt:null},
        list = {strings:{HT:'39-51',VT:'2-24'},elmnt:null},
        weeks = {string:' [34] | [34,35,36] | [34-51]',elmnt:null};
    var all = {toggle:toggle,};
    
    var init = function(){
        //drop-down
        list.elmnt = document.createElement('select');
        for (var k in list.strings){
            var option = document.createElement("option");
            option.textContent = k;
            option.value = list.strings[k];
            list.elmnt.appendChild(option);
        }
        list.elmnt.display = 'inline';
        
        //textbox
        var span = document.createElement('span');
        weeks.elmnt = document.createElement('input');
        weeks.elmnt.type = 'text';
        weeks.elmnt.placeholder = weeks.string;
        span.appendChild(weeks.elmnt);
        span.style.display = 'none';
        
        //toggle
        var s2 = document.createElement('span');
        var t = document.createTextNode(toggle.string);
        var t2 = document.createElement('span');
        t2.appendChild(t);
        toggle.elmnt = document.createElement('input');
        toggle.elmnt.type = 'checkbox';
        s2.appendChild(toggle.elmnt);
        s2.appendChild(t2);
        t2.onclick = function(){
            toggle.elmnt.checked = !toggle.elmnt.checked;
            updateToggle()
        };
        toggle.elmnt.onchange = function(){
            updateToggle()
        };
        
        return [list.elmnt,span,s2]
    };
    var updateToggle = function(){
        if(toggle.elmnt.checked){
            list.elmnt.style.display = 'none';
            weeks.elmnt.parentElement.style.display = 'inline';
        }else{
            list.elmnt.style.display = 'inline';
            weeks.elmnt.parentElement.style.display = 'none';
        }
    };
    var getWeeks = function(){
        var val;
        if(toggle.elmnt.checked)
            val = weeks.elmnt.value;
        else
            val = list.elmnt.value;
        
        var regEx = /(\d{1,2})-(\d{1,2})/g;
        if(val.match(regEx)){
            var m = regEx.exec(val);
            if(m[1]<m[2])return {first:m[1],last:m[2]};
        }else if(val.indexOf(',')!==-1){
            val = val.split(',');
            var ret = [];
            for(var i=0;i<val.length;i++){
                var c = parseInt(val[i]);
                if(!isNaN(c))ret.push(c);
                else console.warn('Unrecoginzed week number, removed!');
            }
            if(ret.length>0)return ret;
        }else if(!isNaN(parseInt(val)))return parseInt(val);
        
        alert('Fel vecko-informatin.\n Vi rekomenderar att du väljer en termin istället.\n du gör detta genom att avaktivera "Avancerade alternativ"');
        throw 'Wrong input: Weeks';
    };
    return {init:init,getWeeks:getWeeks}
}();

var form = function(){
    var inputs = {id:{elmnt:null,string:'Personnummer'},schoolId:null,period:'',submit:'Generera sig!'};
    var create = function(parent){
        inputs.id.elmnt = document.createElement('input');
        inputs.id.elmnt.type = 'text';
        inputs.id.elmnt.placeholder = inputs.id.string;
        parent.appendChild(inputs.id.elmnt);
        
        inputs.schoolId = schoolList;
        parent.appendChild(inputs.schoolId.setup(NOVA.SCHOOLS));
        
        inputs.period = weekSelect;
        var weekSelects = inputs.period.init();
        parent.appendChild(weekSelects[0]);
        parent.appendChild(weekSelects[1]);
        parent.appendChild(weekSelects[2]);
        
        var sbmt = document.createElement('input');
        sbmt.type = 'submit';
        sbmt.value = inputs.submit;
        parent.appendChild(sbmt);
    };
    var isIdValid = function(id){
        return id
    };
    var getData = function(){
        return {id:isIdValid(inputs.id.elmnt.value),schoolId:inputs.schoolId.getElement().value,weeks:inputs.period.getWeeks()}
    };
    return {create:create,getData:getData}
}();

var stringifyJSON = function(obj){
    var all = {values:[],keys:['{{HOME}}']};
    var json = JSON.stringify(obj, function(key, value ) {
        if (typeof value === 'object' && value !== null) {
            if (all.values.indexOf(value) !== -1) {
                var ret,
                    r = {foundCircular:true};
                if(toString.call(value)==='[object Array]'){
                    ret = [];
                    for(var i=0;i<value.length;i++)
                        ret[i]='{{CIRCULAR}}';
                }else{
                    ret = {};
                    for(var k in value)
                        ret[k]='{{CIRCULAR}}';
                }
                r[all.keys[all.values.indexOf(value)]] = ret;
                return r
            }
            all.values.push(value);
            if(all.values.length!=1)all.keys.push(key);
        }
        return value;
    },'\t');
    return json.replace(/\t/g,'&emsp;').replace(/\n/g,'<br>')
};

var errorFunction = function(err){
    if(err.toString()==='[object NovaError]')console.log(err.error.stack);
    else console.log(err);

    var defaultMessage = 'Se till så att du inte har skrivit in fel skola eller id.\nOm du tror felet beror på något annat vänligen följ instruktionerna längst ner på sidan';
    
    //function to add errora and report instructions to footer
    var errorDoc = document.getElementById('error');
    errorDoc.style.display = 'block';
    errorDoc.getElementsByClassName('message')[0].innerHTML = stringifyJSON(err);

    if (error == 'InvalidPDFException') {
        alert('Wrong data: Could not load PDF' + "\n" + "Se till så att du inte har skrivit in fel skola eller id.");
    } else {
        alert(error + "\n" + "Se till så att du inte har skrivit in fel skola eller id.")
    }
};
var successFn = function(objs){
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

    window.h = NOVA.processWeek(NOVA.getSortedDays(textContent));
    console.log(h);

};
var progressFn = function(){
    var weekIndex = {12:'WeekObj'},
        containerId = 'pdfContainer';
    
    var newWeek = function(weekNr){
        var parent = document.getElementById(containerId);
        
        var holder = document.createElement('div');
        holder.className = 'pdf-paper';

        var text = document.createElement('span');
        text.className = 'progress';
        text.innerHTML = '<b>VECKA '+weekNr+'</b>';
        
        holder.appendChild(text);
        parent.appendChild(holder);
        
        holder.responses = [];
        holder.weekNr = weekNr;
        
        weekIndex[weekNr] = holder;
    };
    var addCanvas = function(e){
        if(!weekIndex[e.weekNr])return;
        var canvas = document.createElement('canvas');
        canvas.width = e.viewport.width;
        canvas.height = e.viewport.height;
        var ctx = canvas.getContext('2d');
        
        weekIndex[e.weekNr].insertBefore(canvas,weekIndex[e.weekNr].children[0]);
        e.page.render({canvasContext:ctx,viewport:e.viewport});
    };
    var changeColor = function(bool,weekNr){
        weekIndex[weekNr].done = true;
        
        var color,
            text;
        if(bool){
            color = '#afa';
            text = 'DONE';
        }else{
            color = '#faa';
            text = 'FAILED';
        }
        weekIndex[weekNr].style.backgroundColor = color;
        weekIndex[weekNr].getElementsByClassName('progress')[0].innerHTML+='<br>'+text;
    };
    var addString = function(e){
        var obj = weekIndex[e.weekNr]
        e.timeStamp = new Date().getTime();
        var length = obj.responses.push(e);
        /*setTimeout(function(length,obj){
            var len = obj.responses.length;
            if(len == length && !obj.done)
                changeColor(false,obj.weekNr);
        },1500,length,obj);*/
        obj.getElementsByClassName('progress')[0].innerHTML+='<br>'+e.string;
    };
    var main = function(e){
        if(e.stepType == 'combined' && e.step==0)newWeek(e.weekNr);
        if(e.stepType == 'analyse' && e.step==0)addCanvas(e);
        if(e.string)addString(e);
        if(e.stepType == 'combined' && e.step==1)changeColor(e.succeded,e.weekNr);
        console.log(e);
    };
    return main
}();

window.onload = function(){
    //Add 'fork me' button top right.
    addForkMe('random','right', 'default', document.body);
    
    //Set up a select-option thingy with the SCHOOL-IDS values and content, into the input_form, before periodList. 
    schoolList.setup(NOVA.SCHOOLS, document.getElementById("NOVA-input-form"), document.getElementById("NOVA-period-list"));
    
    
    var mittSchema = new NOVA.Schdule();
    var frm = document.getElementById('NOVA-input-form');
    form.create(frm);
    frm.onsubmit = function(){
        var objs = form.getData();
        mittSchema.loadWeeks({progressFn:progressFn,id:objs.id,schoolId:objs.schoolId,weeks:objs.weeks}).then(function(e){
            console.info(e);
        },function(err){
            console.info(err);
        });
        return false
    };
};