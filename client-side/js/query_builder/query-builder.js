var queryStr = "";
var app = angular.module('app_search', ['ngSanitize', 'queryBuilder']);
app.controller('QueryBuilderCtrl', ['$scope', function ($scope) {
    var data = '{"group": {"operator": "AND","rules": []}}';
    function htmlEntities(str) {
        return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function computed(group) {
        if (!group) {
            return "";
        }
        for (var str = "", i = 0; i < group.rules.length; i++) {
            i > 0 && (str += " "+group.operator+" ");
            str += group.rules[i].group ?
                computed(group.rules[i].group) :
            group.rules[i].field + " " + htmlEntities(group.rules[i].condition) + " " + group.rules[i].data;
        }

        return str+" ";
    }

    $scope.json = null;

    $scope.filter = JSON.parse(data);

    $scope.$watch('filter', function (newValue) {
        $scope.json = JSON.stringify(newValue, null, 2);
        $scope.output = computed(newValue.group);
        queryStr = $scope.output+" ";
        console.log(queryStr);
    }, true);
}]);

var queryBuilder = angular.module('queryBuilder', []);
queryBuilder.directive('queryBuilder', ['$compile', function ($compile) {
    return {
        restrict: 'E',
        scope: {
            group: '='
        },
        templateUrl: '/queryBuilderDirective.html',
        compile: function (element, attrs) {
            var content, directive;
            content = element.contents().remove();
            return function (scope, element, attrs) {
                scope.operators = [
                    { name: 'AND' }
                ];

                //console.log("xxx:"+tableFields.slice());
                scope.fields = tableFields.slice();
                //console.log(scope.fields);
                scope.conditions = [
                    { name: '=' },
                    { name: '<' },
                    { name: '<=' },
                    { name: '>' },
                    { name: '>=' },
                    { name: 'IN'}
                ];

                scope.addCondition = function () {
                    //console.log("add condition is hit");
                    if(typeof tableFields.slice()[0] === 'undefined'){
                        console.log("data is not available currently");
                    }else{
                        item = {};
                        item["condition"] = "=";
                        item["field"] = String(tableFields.slice()[0].name);
                        console.log(tableFields.slice()[0].name);
                        item["data"] = '';
                        scope.group.rules.push(item);
                    }

                };

                scope.removeCondition = function (index) {
                    //console.log("remove condition is hit");
                    scope.group.rules.splice(index, 1);
                };
                scope.update = function(){
                    scope.fields = tableFields.slice();
                    console.log(scope.fields);
                };

                scope.addGroup = function () {
                    scope.group.rules.push({
                        group: {
                            operator: 'AND',
                            rules: []
                        }
                    });
                };

                scope.removeGroup = function () {
                    console.log("remove group is hit");
                    "group" in scope.$parent && scope.$parent.group.rules.splice(scope.$parent.$index, 1);
                };

                directive || (directive = $compile(content));

                element.append(directive(scope, function ($compile) {
                    return $compile;
                }));
            }
        }
    }
}]);
