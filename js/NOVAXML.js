var NOVA = NOVA || {};

NOVA.loadPDF = function(loc,scale) {
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

window.onload = function(){
    //Disabled for development
    //var url = "php/phpProxy.php?id=" + id + "&week=" + week + "&school=" + schoolId;
    var url = "Schedule.pdf";
    
    NOVA.loadPDF(url,{width:window.innerWidth,height:500,renderMode:'cover'}).then(function(objs){
        var viewport = objs.viewport,
            page = objs.page,
            textContent = objs.renderContext;
        
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
        
    }).catch(function(err){console.log(err)});
};