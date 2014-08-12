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
    var /*id = 'schools-select-id',*/
        element;
    var setup = function(schoolIds, parent, insertBefore) {
        //Create select
        var selectSchool = document.createElement("select");
        //selectSchool.id = id;
        //Create options and insert them into select
        for (var k in schoolIds){
            //Create option
            var option = document.createElement("option");
            option.textContent = k;
            option.value = schoolIds[k];

            //Insert option into select
            selectSchool.appendChild(option);
        }
        //insert select into DOM.
        element = selectSchool;
        parent.insertBefore(selectSchool, insertBefore);
    }
    var getElement = function(){
        return element
    };
    return {setup:setup,getElement:getElement}
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

window.onload = function(){
    //Add 'fork me' button top right.
    addForkMe('random','right', 'default', document.body);
    
    //Set up a select-option thingy with the SCHOOL-IDS values and content, into the input_form, before periodList. 
    schoolList.setup(NOVA.SCHOOLS, document.getElementById("NOVA-input-form"), document.getElementById("NOVA-period-list"));
    
    document.getElementById('NOVA-submit-btn').onclick = function(){
        var url = NOVA.getNovaUrl({schoolId:schoolList.getElement().value,id:document.getElementById('NOVA-user-id').value,week:prompt('week:')});

        NOVA.loadPDF(url,{width:window.innerWidth,height:500,renderMode:'contain'}).then(successFn).catch(errorFunction);

        return false
    };
};