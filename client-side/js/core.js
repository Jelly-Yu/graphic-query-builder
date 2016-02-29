var tableFields = [];
var allSelected = false;
(function() {     
    var cells = [];
    var tables = new Map();
    var tableStr = "",
        fieldStr = "",
        queryStatement = "",
        serverURL = "http://localhost:1500/",
        ksName = "keyspace1.";
    $(document).ready(function() {
        //create a floating query output area
        $(window).scroll(function(){
            $("#query_str").stop().animate({"marginTop": ($(window).scrollTop()) + "px", "marginLeft":($(window).scrollLeft()) + "px"}, "slow" );
        });


        //get all tables in db.test_keyspace 
        $.ajax({
            type:"GET",
            url: serverURL + 'tables',
            success:function(data) {
                console.log(data);
                //var tbs = $.parseJSON(data);
                for(var i =0; i< data.length;i++){
                    var name = data[i].columnfamily_name;
                    console.log(name);
                    tables.set(name, []);
                }

                //initialize table select
                $('#field_select').searchableOptionList();
                $('#table_select').searchableOptionList({
                    //format data for option list
                    data:function(){
                        dataInSolFormat = [];
                        $.each(data,function(i,v){
                            var name = v.columnfamily_name;
                            singleOption = {};
                            singleOption["type"]="option";
                            singleOption["label"]= name;
                            singleOption["value"] = name;
                            dataInSolFormat.push(singleOption);
                        });
                        return dataInSolFormat;
                    },
                    //register trigger events
                    events:{
                        onChange:function(sol,changedElements){
                            console.log(sol.getSelection());
                            getColumns(sol.getSelection());

                        }
                    },
                    maxHeight: '150px'
                });
            },

            error: function( req, status, err ) {
                console.log( 'something went wrong', status, err );
                alert("500: Internal Server Error");

            }
        });

        //bind click event to submit button
        $("#btn_submit").click(function(){
            console.log("hit the button");
            //console.log(queryStatement);
            var searchQuery = "";
            console.log(":"+ queryStr+":");
            searchQuery = queryStr.length > 5 ?  queryStatement + "WHERE " + queryStr : queryStatement;
            fetchData(searchQuery);
        });

        //resizable columns
        var pressed = false;
        var start = undefined;
        var startX, startWidth;

        $("table").on('mousedown','th', function(e) {
            start = $(this);
            pressed = true;
            startX = e.pageX;
            startWidth = $(this).width();
            $(start).addClass("resizing");
            $(start).addClass("noSelect");
        });

        $(document).on('mousemove',function(e) {
            if(pressed) {
                $(start).width(startWidth+(e.pageX-startX));
            }
        });

        $(document).on('mouseup',function() {
            if(pressed) {
                $(start).removeClass("resizing");
                $(start).removeClass("noSelect");
                pressed = false;
            }
        });
    });

    function getColumns(selectedItems){
        if(selectedItems.length < 1){
            renderOptionList(selectedItems);
        }else{
            $.each(selectedItems,function(i,v){
                var tablename = v.value;
                if(tables.get(tablename).length > 0){
                    renderOptionList(selectedItems);
                }else{
                    $.ajax({
                        type:"GET",
                        url:serverURL + 'metadata/description?table='+tablename,
                        success:function(data){
                            console.log(data.partitionKeys);
                            tableFields= [];
                            
                            $.each(data.partitionKeys,function(i,item){
                                var newField = {};
                                newField["name"] = item.name;
                                tableFields.push(newField);
                            });
                            $.each(data.clusteringKeys,function(i,item){
                                var newField = {};
                                newField["name"] = item.name;
                                tableFields.push(newField);
                            });
                            console.log(tableFields);
                           
                        },
                        error: function(req, status, err){
                            console.log('something bad happened', status, err);
                        }
                    });
                    $.ajax({
                        type:"GET",
                        url:serverURL + 'tables/columns?table='+tablename,
                        success:function(data) {
                            console.log(data);
                            var cols = data;
                            var temp = tables.get(tablename);
                            for(var i =0; i< cols.length;i++){
                                var name = cols[i].column_name;
                                console.log(name);
                                temp.push(name);
                                console.log(temp);
                            }
                            tables.set(tables.get(tablename), temp);
                            console.log(tables.get(tablename));
                            renderOptionList(selectedItems);
                        },
                        error: function( req, status, err ) {
                            console.log( 'something went wrong', status, err );
                        }
                    });
                }            
            });        
        }    
    }

    function renderOptionList(selectedItems){
        //update options in field select according to selected options in table select
        $('#field_selector').empty();
        $('#field_selector').append('<select id="field_select" name="character" multiple="multiple"></select>');
        $('#field_select').searchableOptionList({
            data:function(){
                dataInSolFormat = [];
                tableStr = "";
                $.each(selectedItems,function(i,v){
                    var name = v.value;
                    tableStr = tableStr+ name + ',';
                    if(tables.has(name)){
                        tname = tables.get(name);
                        console.log(tname);
                        $.each(tname, function(i, item){
                            singleOption = {};
                            singleOption["type"]="option";
                            singleOption["label"]= item + " ("+name+")";
                            singleOption["value"] = item;
                            dataInSolFormat.push(singleOption);
                        });                                        
                    }
                    else{
                        console.log("table not exist");
                    }            
                });
                console.log(tableStr);
                fieldStr="";
                var temp = allSelected === true? "*" : fieldStr.substring(0,fieldStr.length -1);
                var str = "SELECT "+ temp + " FROM "+ ksName + tableStr.substring(0, tableStr.length-1) ;
                $("#result").html(str);
                queryStatement = str+ " ";
                return dataInSolFormat; 
            },
            events:{
                onChange:function(sol,changedElements){
                    console.log(sol.getSelection());
                    fieldStr="";
                    $.each(sol.getSelection(),function(i,item){
                        fieldStr = fieldStr +item.value + ',';
                    });
                    console.log(fieldStr);
                    var temp = allSelected === true? "*" : fieldStr.substring(0,fieldStr.length -1);
                    var str = "SELECT "+ temp + " FROM "+ ksName + tableStr.substring(0, tableStr.length-1);
                    $("#result").html(str);
                    queryStatement = str+ " ";
                }
            },
            maxHeight:250
        });
    }
    //send query statement to server via post request 
    function fetchData(query){

        console.log(query);    
        $.post(serverURL + "search", {qStr: query},function(data){

        }).done(function(data){
            console.log(data);
            cells = data.slice();
            //console.log(items);
            if(cells.length !== 0){
                populateTable();
            }else{
                $("#result_info").html("<p>No matches.</p>");
                $("#table_header").html("");
                $("#table_rows").html("");
            }
            
        })
        .fail(function(){
            $("#result_info").html("<p>Failed to parse the query.</p>");
            $("#table_header").html("");
            $("#table_rows").html("");

        });
    }

    function populateTable(){
        $("#result_info").html("");
        var firstItem = cells[0];
        var content = "";
        var temp_keys = [];
        for(var key in firstItem){
            console.log(key);
            if(firstItem.hasOwnProperty(key)){
                content += "<th><div class='noCrsr'>"+key+"</div></th>" ;
                temp_keys.push(key);
            }
        }
       // console.log(keys);
        $("#table_header").html(content);
        content = "<tr>";
        $.each(cells, function(i,c){
            //console.log(item);
            for(var i = 0; i< temp_keys.length;i++){

                var val = c[temp_keys[i]];
                console.log(val);
                content += "<td>"+val+"</td>";
            }
            content += "</tr>";
        })
        $("#table_rows").html(content);
    }
})();  
