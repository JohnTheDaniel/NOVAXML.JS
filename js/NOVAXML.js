var NOVA = NOVA || {};

NOVA.loadPDF = function(id, schoolId, week, container) {
    if (typeof PDFJS === 'undefined') {
        alert('Built version of pdf.js is not found\nPlease run `node make generic`');
        return;
    }

    var scale = 1.5; //Set this to whatever you want. This is basically the "zoom" factor for the PDF.
    //PDFJS.workerSrc = '../../build/generic/build/pdf.worker.js';
    
    //Disabled for development
    //var url = "php/phpProxy.php?id=" + id + "&week=" + week + "&school=" + schoolId;  
    
    var url = "Schedule.pdf"; 
    
    PDFJS.getDocument(url).then(function(pdf) { //Replace this with link to proxy with params.
        pdf.getPage(1).then(function(page) {

            var scale = 1.5;
            var viewport = page.getViewport(scale);

            //var container = document.getElementById("pdfContainer");
            
            var canvas = document.createElement("canvas");
            var context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            container.appendChild(canvas);

            page.getTextContent().then(function(textContent) {
                
                var renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                page.render(renderContext);
                
                
            });


        });
    });
};