// first use of Omeka S based on a specific item-set
const maxWidth="800px"; // largeur maximale des images
//const urlAPI = "https://www.philippe.motsvoir.org/omk/api/"; // mon test original
const urlAPI = "https://www.rit.motsvoir.org/api/"; // utilisé pour l'atelier
var item_sets = []; // list of all the item sets
var inner = ""; //HTML part of the select tag
var data = []; // array containing displayed data
var timer; // timer for the animation
var currentData=0; //number of items to display
var rapportH = 1;
var maxH;
var mw;
const descriptionTag = document.querySelector("#texte");
const imageTag = document.querySelector("#image");
const cacheTag = document.querySelector("#hiddenImage");
const container = document.querySelector("#container");

document.querySelector("#stop").addEventListener("click",stopPG);
document.querySelector("body").style.maxWidth=maxWidth;
cacheTag.addEventListener("load",cacheLoaded);

// downloading the item sets
fetch(urlAPI+"item_sets?pretty_print=1")
.then (x => x.json())
.then (x => {
    console.log(x); // displays the array of all item sets in the console
    x.forEach(x => {
        let Obj = {};
        Obj.id = x["o:id"];
        Obj.title = x["o:title"];
        item_sets.push(Obj);
        inner=inner+"<option value ="+"'"+Obj.id+"'"+">"+Obj.title+"</option>";
    });
    console.log(item_sets); // displays ine the console the useful part of the item sets for the selection
    console.log(inner); // displays in the console the HTML list for the selection
    document.querySelector("#sets").innerHTML = inner;
    document.querySelector("#run").addEventListener("click",choisirSet);
    document.querySelector("#choose").style.display="block";
});

function choisirSet(){
    descriptionTag.innerText = "donwloading the selected item set";
    downloadData(document.querySelector("#sets").value);
}

function stopPG (){
    clearInterval(timer);
}

function downloadData(itemSetID) {
    //downloading the selected item set
    console.log(itemSetID); // displays in the console the id of the selected item set
    fetch (urlAPI+"items?item_set_id="+itemSetID)
    .then(x => x.json())
    .then (x => {console.log(x); return x;}) //displays in the console the array of the items of the selected item set
    .then (y => { // downloading the items of the selected item set
        y.forEach( x => {
            var Obj = {};
            Obj.id = x["o:id"];
        Obj.title = x["dcterms:title"][0]["@value"]; // only the 1° title is used
            Obj.description = x["dcterms:description"][0]["@value"]; // only the 1° description is used
            Obj.media = {};
            Obj.media.id = x["o:media"][0]["o:id"]; // only the 1° media is used
            data.push(Obj);
        });
        console.log(data); // intermediate displaying
        preloadImages();
    });
}

function preloadImages(){
    //downloading the 1°picture of the selected items
    descriptionTag.innerText = "donwloading the pictures";
    var promisesPictures = []; // array containing the instructions for downloading media information about pictures
    data.forEach( d => {
        promisesPictures.push(fetch(urlAPI+"media/"+d.media.id).then(x=>x.json()));  
    });
    Promise.all(promisesPictures)
    .then (x=>{console.log(x);return x;}) // displays in the console the metada about the useful pictures
    .then ( x => { 
        var n = 0;
        var photos = [];
        x.forEach( x => { // complete metadata about pictures
            data[n].media.type = x["o:media_type"];
            data[n].media.source = x["o:source"];
            data[n].media.originalURL = x["o:original_url"];
            data[n].media.loaded = false;           
            n++;
        });
        loadFileBlob(0,data[0].media.originalURL);
    });
}

function loadFileBlob(n,url){
    fetch(url)
    .then (x => x.blob())
    .then (y => {
        data[n].media.url = URL.createObjectURL(y);
        data[n].media.loaded=true;
        cacheTag.src = data[n].media.url;
    })
}

function finPreload (){
    let suite = true;
    data.forEach (d => {
        suite = suite & d.media.loaded;    
    });
    if (suite) {
        cacheTag.removeEventListener("load",cacheLoaded);
        initVisu();
    }else{
        loadFileBlob(currentData,data[currentData].media.originalURL);
    }
} 

function initVisu(){
    console.log(data); //display all data in the console
    currentData = 0;
    var hauteurs = [];
    mw = maxWidth.slice(0,maxWidth.length-2);
    mw=792*mw/800;
    data.forEach (d => {
        let w = d.media.width.slice(0,d.media.width.length-2);
        let h = d.media.height.slice(0,d.media.height.length-2);
        if (w > mw){
            hauteurs.push(Math.ceil(h*mw/w));
        } else {
            hauteurs.push(h);
        }
    });
    var wStr = window.getComputedStyle(container).getPropertyValue("width");
    rapportH = wStr.slice(0,wStr.length-2)/mw;
    maxH = Math.max(...hauteurs);
    document.querySelector("#imageContainer").style.height = (maxH*rapportH)+"px";
    window.addEventListener("resize",calculeHauteur);
    timer = setInterval(bascule,1000);  
}

function calculeHauteur(){
    var wStr = window.getComputedStyle(container).getPropertyValue("width");
    rapportH = wStr.slice(0,wStr.length-2)/mw;
    if (rapportH > 1){rapportH = 1;}
    document.querySelector("#imageContainer").style.height = (maxH*rapportH)+"px";
}

function cacheLoaded(){
    data[currentData].media.width=window.getComputedStyle(cacheTag).getPropertyValue("width");
    data[currentData].media.height=window.getComputedStyle(cacheTag).getPropertyValue("height");
    currentData++;
    finPreload();  
}

function bascule(){
    descriptionTag.innerText=data[currentData].description;
    imageTag.src=data[currentData].media.url;
    currentData++;
    currentData = currentData%data.length;
}