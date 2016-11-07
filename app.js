angular.module("app.config", [])
.constant("REST_URL", "http://test-api.javascript.ru/v1/abazhenau");

angular.module('shared.module', ['app.config']);

angular.module('shared.module').config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('HttpErrorInterceptor');
    $httpProvider.interceptors.push('HttpRequestLoadIndicatorInterceptor');
}]);

angular.module('shared.module').run(['$rootScope', '$state', 'AuthService', 'StateService',
    function($rootScope, $state, AuthService, StateService) {
        $rootScope.$on('$stateChangeStart', function(e, toState, toParams, fromState, fromParams) {
            if (toState.data.needAuth && !AuthService.isAuthenticated()) {
                e.preventDefault();
                StateService.setLoginRedirectState(toState, toParams);
                $state.go('login');
            } else {
                StateService.setPreviousState(fromState, fromParams);
            }
        });
    }]);
angular.module('home.module', ['app.config', 'shared.module', 'ui.router']);

angular.module('home.module').config(['$stateProvider', function($stateProvider) {
    $stateProvider.state('home', {
        url: '/home',
        template: '<home-page></home-page>',
        data: {
            needAuth: false
        }
    });
}]);



angular.module('login.module', ['app.config', 'shared.module', 'ui.router']);

angular.module('login.module').config(['$stateProvider', function($stateProvider) {
    $stateProvider.state('login', {
        url: '/login',
        template: '<login-page></login-page>',
        data: {
            needAuth: false
        }
    });
}]);
angular.module('mail.module', ['app.config', 'shared.module', 'ui.router', 'ngResource']);

angular.module('mail.module').config(['$stateProvider', function($stateProvider) {

    $stateProvider.state('mailboxes', {
        url: '/mailboxes',
        template: '<mails-page></mails-page>',
        data: {
            needAuth: true
        }
    });

    $stateProvider.state('mail-create', {
        url: '/mail-create',
        template: '<mail-create-page></mail-create-page>',
        data: {
            needAuth: true
        }
    });

    $stateProvider.state('mailboxes.mail-table', {
        url: '/:mailboxId',
        template: '<mail-table mailbox-id="mailboxId"></mail-table>',
        controller: ['$scope', '$stateParams', function($scope, $stateParams) {
            $scope.mailboxId = $stateParams.mailboxId;
        }],
        data: {
            needAuth: true
        }
    });

    $stateProvider.state('mailboxes.mail-item-detailed', {
        url: '/:mailboxId/mail/:letterId',
        template: '<mail-detailed mailbox-id="mailboxId" letter-id="letterId"></mail-detailed>',
        controller: ['$scope', '$stateParams', function($scope, $stateParams) {
            $scope.mailboxId = $stateParams.mailboxId;
            $scope.letterId = $stateParams.letterId;
        }],
        data: {
            needAuth: true
        }
    });
}]);



angular.module('main.module', ['app.config', 'shared.module', 'ui.router']);



angular.module('user.module', ['app.config', 'shared.module', 'ui.router', 'restangular']);

angular.module('user.module').config(['RestangularProvider', '$stateProvider', 'REST_URL',
    function(RestangularProvider, $stateProvider, REST_URL) {
    RestangularProvider.setBaseUrl(REST_URL);
    RestangularProvider.setRestangularFields({ id: "_id" });

    $stateProvider.state('users', {
        url: '/users',
        template: '<users-page></users-page>',
        data: {
            needAuth: true
        }
    });

    $stateProvider.state('users.user-detailed', {
        url: '/user/:userId',
        template: '<user-item-detailed user-id = "userId" ></user-item-detailed>',
        controller: ['$scope', '$stateParams', function($scope, $stateParams) {
            $scope.userId = $stateParams.userId;
        }],
        data: {
            needAuth: true
        }
    });

    $stateProvider.state('users.user-edit', {
        url: '/user-edit/:userId',
        template: '<user-item-edit user-id = "userId" ></user-item-edit>',
        controller: ['$scope', '$stateParams', function($scope, $stateParams) {
            $scope.userId = $stateParams.userId;
        }],
        data: {
            needAuth: true
        }
    });

    $stateProvider.state('users.user-new', {
        url: '/user-new',
        template: '<user-item-edit></user-item-edit>',
        data: {
            needAuth: true
        }
    });
}]);



var test = "exclude this";

angular.module('main.module').component('mainLayout',  {
    templateUrl: 'main/main-layout.component.html',
    controller: ['$state', 'AuthService', function($state, AuthService) {
        this.logout = function() {
            AuthService.logout();
            $state.go('login');
        };

        this.getAuthenticatedUser = function() {
            return AuthService.getAuthenticatedUser();
        };

        this.isAuthenticated = function () {
            return AuthService.isAuthenticated();
        }
    }]
});

angular.module('home.module').component('homePage',  {
    templateUrl: 'home/home-page/home-page.component.html'
});
angular.module('login.module').component('loginPage', {
    templateUrl: 'login/login-page/login-page.component.html' ,
    controller: ['$state', 'AuthService', 'StateService', function($state, AuthService, StateService) {
        var ctx = this;
        this.showError = false;

        this.login = function() {
            if (this.credentials) {
                AuthService.authenticate(this.credentials.username, this.credentials.password).then(function(isAuthenticated) {
                    if (isAuthenticated) {
                        var previousState = StateService.getLoginRedirectState();
                        if (previousState) {
                            $state.go(previousState.state, previousState.params, {reload: true});
                        } else {
                            $state.go('home');
                        }
                    } else {
                        ctx.errorMessage = true;
                    }
                });
            } else {
                this.errorMessage = true;
            }
        };
    }]
});


angular.module('mail.module').component('mailCreatePage', {
    templateUrl: 'mail/mail-create-page/mail-create-page.component.html' ,
    controller: ['MailboxService', 'LetterService', 'StateService', '$state', '$q',
        function(MailboxService, LetterService, StateService, $state, $q) {
        var ctx = this;

        this.cancel = function() {
            var previousState = StateService.getPreviousState();
            $state.go(previousState.state, previousState.params);
        };

        this.save = function() {
            saveMessageToMailbox('draft', this.message);
        };

        this.send = function () {
            saveMessageToMailbox('outbox', this.message);
        };
        
        function saveMessageToMailbox(mailboxTitle, message) {
            getMailboxByTitle(mailboxTitle).then(function(mailbox) {
                message.mailbox = mailbox._id;
                LetterService.save(message, function() {
                    var previousState = StateService.getPreviousState();
                    $state.go(previousState.state, previousState.params);
                });
            });
        }
        
        function getMailboxByTitle(title) {
            var deferred = $q.defer();
            
            MailboxService.query(function(mailboxes) {
                var mailbox = mailboxes.filter(function(mailbox) {
                    return mailbox.title === title;
                });

                deferred.resolve(mailbox[0]);
            });

            return deferred.promise;
        }
    }]
});

angular.module('mail.module').component('mailsPage',  {
    templateUrl: 'mail/mails-page/mails-page.component.html'
});

angular.module('mail.module').factory('LetterService', ['$resource', 'REST_URL', function ($resource, REST_URL) {
    return $resource(REST_URL + '/letters/:id',{
        id: '@_id',
    });
}]);

angular.module('mail.module').factory('MailboxService', ['$resource', 'REST_URL', function ($resource, REST_URL) {
    return $resource(REST_URL + '/mailboxes/:id',{
        id: '@_id',
    });
}]);

angular.module('shared.module').service('AuthService', ['$q', function($q) {

    // TODO : make real REST request

    var authenticatedUser;
    var isAuthenticated = false;

    this.authenticate = function(login, password) {
        if (login == 'test' && password == 'test') {
            isAuthenticated = true;
            authenticatedUser = login;
            return $q.resolve(true);
        } else {
            return $q.resolve(false);
        }
    };

    this.isAuthenticated = function() {
        return isAuthenticated;
    };

    this.getAuthenticatedUser = function() {
        return authenticatedUser;
    }

    this.logout = function() {
        isAuthenticated = false;
        authenticatedUser = null;
    };

}]);
angular.module('shared.module').component('httpAjaxLoadIndicator',  {
    templateUrl: 'shared/http-ajax-load-indicator/http-ajax-load-indicator.component.html',
    controller: ['$scope', function($scope){
        var ctx = this;
        this.showLoadIndicator = false;

        $scope.$on("loader_show", function () {
            ctx.showLoadIndicator = true;
        });

        $scope.$on("loader_hide", function () {
            ctx.showLoadIndicator = false;
        });
    }]
});


angular.module('shared.module').factory('HttpRequestLoadIndicatorInterceptor', ['$q', '$rootScope', function($q, $rootScope) {

    var numLoadings = 0;

    var httpRequestLoadIndicatorInterceptor = {
        request: function (config) {
            numLoadings++;

            $rootScope.$broadcast("loader_show");
            return config || $q.when(config)

        },
        response: function (response) {
            if ((--numLoadings) === 0) {
                $rootScope.$broadcast("loader_hide");
            }

            return response || $q.when(response);

        },
        responseError: function (response) {
            if (!(--numLoadings)) {
                // Hide loader
                $rootScope.$broadcast("loader_hide");
            }

            return $q.reject(response);
        }
    };

    return httpRequestLoadIndicatorInterceptor;

}]);



angular.module('shared.module').component('httpStaticLoadIndicator',  {
    templateUrl: 'shared/http-ajax-load-indicator/http-static-load-indicator.component.html'
});

angular.module('shared.module').factory('HttpErrorInterceptor', ['$q', function($q) {
    var httpErrorInterceptor = {
        responseError: function(rejection) {
            if (rejection.status == 401 || rejection.status == 405) {
                // TODO : go to login
            } else if (rejection.status == 403) {
                // TODO : go to previous state
            } else if (rejection.status == 404) {
                // TODO : go to home
            } else {
                // TODO : show error
            }

            return $q.reject(rejection);
        }
    };

    return httpErrorInterceptor;
}]);

angular.module('shared.module').service('StateService', function() {

    var loginRedirectState;
    var previousState;

    this.setLoginRedirectState = function(state, params) {
        loginRedirectState = { state: state, params: params };
    };

    this.getLoginRedirectState = function() {
        return loginRedirectState;
    };

    this.setPreviousState = function(state, params) {
        previousState = { state: state, params: params };
    };

    this.getPreviousState = function() {
        return previousState;
    };

});

angular.module('user.module').service('UserService', ['$q', 'Restangular', function($q, Restangular) {

    this.getAll = function() {
        return Restangular.all('users').getList();
    };

    this.getOne = function(userId) {
        return Restangular.one('users', userId).get();
    };

    this.delete = function(user) {
        return user.remove();
    };

    this.save = function(user) {
        if (user._id) {
            var deferred = $q.defer();

            user.remove().then(function() {
                Restangular.all('users').post(user).then(function(user) {
                    deferred.resolve(user);
                });
            });

            return deferred.promise;
        } else {
            return Restangular.all('users').post(user);
        }
    };

}]);
angular.module('user.module').component('usersPage',  {
    templateUrl: 'user/users-page/users-page.component.html'
});

angular.module('mail.module').component('mailDetailed', {
        bindings: {
            letterId: '<',
            mailboxId: '<'
        },
        templateUrl: 'mail/mails-page/mail-detailed/mail-detailed.component.html' ,
        controller: ['LetterService', '$state', function(LetterService, $state) {
            var ctx = this;
            LetterService.get({ id : this.letterId}, function(letter) {
                ctx.letter = letter;
            });

            this.goBack = function() {
                $state.go('mailboxes.mail-table', { mailboxId: ctx.mailboxId });
            };

            this.delete = function() {
                ctx.letter.$delete(function() {
                    $state.go('mailboxes.mail-table', { mailboxId: ctx.mailboxId });
                });
            };
        }]
    });
angular.module('mail.module').component('mailTable', {
        bindings: {
            mailboxId: '<',
        },
        templateUrl: 'mail/mails-page/mail-table/mail-table.component.html',
        controller: ['LetterService', function(LetterService){
            var ctx = this;
            LetterService.query(function(letters) {
                ctx.letters = letters.filter(function(letter) {
                    return letter.mailbox === ctx.mailboxId;
                });
            });
        }]
    });
angular.module('mail.module').component('mailboxList',  {
    templateUrl: 'mail/mails-page/mailbox-list/mailbox-list.component.html',
    controller: ['MailboxService', '$state', function(MailboxService, $state){
        var ctx = this;
        MailboxService.query(function(mailboxes) {
            ctx.mailboxes = mailboxes;
            if (mailboxes && mailboxes.length > 0) {
                $state.go('mailboxes.mail-table', { mailboxId: mailboxes[0]._id });
            }
        });
    }]
});

angular.module('user.module').component('userItemDetailed',  {
    bindings: {
        userId: "<"
    },
    templateUrl: 'user/users-page/user-item-detailed/user-item-detailed.component.html',
    controller: ['UserService', '$state', function(UserService, $state){
        var ctx = this;

        this.delete = function() {
            UserService.delete(this.user).then(function() {
                $state.go('users', {}, {reload: true});
            });
        };

        UserService.getOne(this.userId).then(function(user) {
            ctx.user = user;
        });
    }]
});

angular.module('user.module').component('userItemEdit',  {
    bindings: {
        userId: "<"
    },
    templateUrl: 'user/users-page/user-item-edit/user-item-edit.component.html',
    controller: ['UserService', '$state', function(UserService, $state){
        var ctx = this;

        this.cancel = function() {
            if (this.userId) {
                $state.go('users.user-detailed', {userId: this.userId});
            } else {
                $state.go('users');
            }
        };

        this.delete = function() {
            UserService.delete(this.user).then(function() {
                $state.go('users', {}, {reload: true});
            });
        };

        this.save = function() {
            UserService.save(this.user).then(function(user) {
                $state.go('users.user-detailed', {userId: user._id }, {reload: true});
            });
        };

        if (this.userId) {
            UserService.getOne(this.userId).then(function(user) {
                ctx.user = user;
            });
        }
    }]
});


angular.module('user.module').component('userList',  {
    templateUrl: 'user/users-page/user-list/user-list.component.html',
    controller: ['Restangular', function(Restangular){
        var ctx = this;
        Restangular.all('users').getList().then(function(users) {
            ctx.users = users;
        });
    }]
});

angular.module('mailApp', ['shared.module', 'main.module', 'home.module', 'login.module', 'user.module', 'mail.module', 'ui.router']);

angular.module('mailApp').config(['$urlRouterProvider', function($urlRouterProvider) {
    $urlRouterProvider
        .otherwise('/home');
}]);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC1jb25maWcuanMiLCJzaGFyZWQvc2hhcmVkLm1vZHVsZS5qcyIsImhvbWUvaG9tZS5tb2R1bGUuanMiLCJsb2dpbi9sb2dpbi5tb2R1bGUuanMiLCJtYWlsL21haWwubW9kdWxlLmpzIiwibWFpbi9tYWluLm1vZHVsZS5qcyIsInVzZXIvdXNlci5tb2R1bGUuanMiLCJtYWlsL2V4YW1wbGUuc3BlYy5qcyIsIm1haW4vbWFpbi1sYXlvdXQuY29tcG9uZW50LmpzIiwiaG9tZS9ob21lLXBhZ2UvaG9tZS1wYWdlLmNvbXBvbmVudC5qcyIsImxvZ2luL2xvZ2luLXBhZ2UvbG9naW4tcGFnZS5jb21wb25lbnQuanMiLCJtYWlsL21haWwtY3JlYXRlLXBhZ2UvbWFpbC1jcmVhdGUtcGFnZS5jb21wb25lbnQuanMiLCJtYWlsL21haWxzLXBhZ2UvbWFpbHMtcGFnZS5jb21wb25lbnQuanMiLCJtYWlsL3NlcnZpY2UvbGV0dGVyLnNlcnZpY2UuanMiLCJtYWlsL3NlcnZpY2UvbWFpbGJveC5zZXJ2aWNlLmpzIiwic2hhcmVkL2F1dGgtc2VydmljZS9hdXRoLnNlcnZpY2UuanMiLCJzaGFyZWQvaHR0cC1hamF4LWxvYWQtaW5kaWNhdG9yL2h0dHAtYWpheC1sb2FkLWluZGljYXRvci5jb21wb25lbnQuanMiLCJzaGFyZWQvaHR0cC1hamF4LWxvYWQtaW5kaWNhdG9yL2h0dHAtcmVxdWVzdC1sb2FkLWluZGljYXRvci1pbnRlcmNlcHRvci5qcyIsInNoYXJlZC9odHRwLWFqYXgtbG9hZC1pbmRpY2F0b3IvaHR0cC1zdGF0aWMtbG9hZC1pbmRpY2F0b3IuY29tcG9uZW50LmpzIiwic2hhcmVkL2h0dHAtZXJyb3ItaGFuZGxlci9odHRwLWVycm9yLWludGVyY2VwdG9yLmpzIiwic2hhcmVkL3N0YXRlLXNlcnZpY2Uvc3RhdGUuc2VydmljZS5qcyIsInVzZXIvc2VydmljZS91c2VyLnNlcnZpY2UuanMiLCJ1c2VyL3VzZXJzLXBhZ2UvdXNlcnMtcGFnZS5jb21wb25lbnQuanMiLCJtYWlsL21haWxzLXBhZ2UvbWFpbC1kZXRhaWxlZC9tYWlsLWRldGFpbGVkLmNvbXBvbmVudC5qcyIsIm1haWwvbWFpbHMtcGFnZS9tYWlsLXRhYmxlL21haWwtdGFibGUuY29tcG9uZW50LmpzIiwibWFpbC9tYWlscy1wYWdlL21haWxib3gtbGlzdC9tYWlsYm94LWxpc3QuY29tcG9uZW50LmpzIiwidXNlci91c2Vycy1wYWdlL3VzZXItaXRlbS1kZXRhaWxlZC91c2VyLWl0ZW0tZGV0YWlsZWQuY29tcG9uZW50LmpzIiwidXNlci91c2Vycy1wYWdlL3VzZXItaXRlbS1lZGl0L3VzZXItaXRlbS1lZGl0LmNvbXBvbmVudC5qcyIsInVzZXIvdXNlcnMtcGFnZS91c2VyLWxpc3QvdXNlci1saXN0LmNvbXBvbmVudC5qcyIsImFwcC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0NBO0FBQ0E7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoXCJhcHAuY29uZmlnXCIsIFtdKVxuLmNvbnN0YW50KFwiUkVTVF9VUkxcIiwgXCJodHRwOi8vdGVzdC1hcGkuamF2YXNjcmlwdC5ydS92MS9hYmF6aGVuYXVcIik7XG4iLCJhbmd1bGFyLm1vZHVsZSgnc2hhcmVkLm1vZHVsZScsIFsnYXBwLmNvbmZpZyddKTtcclxuXHJcbmFuZ3VsYXIubW9kdWxlKCdzaGFyZWQubW9kdWxlJykuY29uZmlnKFsnJGh0dHBQcm92aWRlcicsIGZ1bmN0aW9uKCRodHRwUHJvdmlkZXIpIHtcclxuICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goJ0h0dHBFcnJvckludGVyY2VwdG9yJyk7XHJcbiAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdIdHRwUmVxdWVzdExvYWRJbmRpY2F0b3JJbnRlcmNlcHRvcicpO1xyXG59XSk7XHJcblxyXG5hbmd1bGFyLm1vZHVsZSgnc2hhcmVkLm1vZHVsZScpLnJ1bihbJyRyb290U2NvcGUnLCAnJHN0YXRlJywgJ0F1dGhTZXJ2aWNlJywgJ1N0YXRlU2VydmljZScsXHJcbiAgICBmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsIEF1dGhTZXJ2aWNlLCBTdGF0ZVNlcnZpY2UpIHtcclxuICAgICAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbihlLCB0b1N0YXRlLCB0b1BhcmFtcywgZnJvbVN0YXRlLCBmcm9tUGFyYW1zKSB7XHJcbiAgICAgICAgICAgIGlmICh0b1N0YXRlLmRhdGEubmVlZEF1dGggJiYgIUF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZVNlcnZpY2Uuc2V0TG9naW5SZWRpcmVjdFN0YXRlKHRvU3RhdGUsIHRvUGFyYW1zKTtcclxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIFN0YXRlU2VydmljZS5zZXRQcmV2aW91c1N0YXRlKGZyb21TdGF0ZSwgZnJvbVBhcmFtcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1dKTsiLCJhbmd1bGFyLm1vZHVsZSgnaG9tZS5tb2R1bGUnLCBbJ2FwcC5jb25maWcnLCAnc2hhcmVkLm1vZHVsZScsICd1aS5yb3V0ZXInXSk7XHJcblxyXG5hbmd1bGFyLm1vZHVsZSgnaG9tZS5tb2R1bGUnKS5jb25maWcoWyckc3RhdGVQcm92aWRlcicsIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcclxuICAgICAgICB1cmw6ICcvaG9tZScsXHJcbiAgICAgICAgdGVtcGxhdGU6ICc8aG9tZS1wYWdlPjwvaG9tZS1wYWdlPicsXHJcbiAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICBuZWVkQXV0aDogZmFsc2VcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufV0pO1xyXG5cclxuXHJcbiIsImFuZ3VsYXIubW9kdWxlKCdsb2dpbi5tb2R1bGUnLCBbJ2FwcC5jb25maWcnLCAnc2hhcmVkLm1vZHVsZScsICd1aS5yb3V0ZXInXSk7XHJcblxyXG5hbmd1bGFyLm1vZHVsZSgnbG9naW4ubW9kdWxlJykuY29uZmlnKFsnJHN0YXRlUHJvdmlkZXInLCBmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xyXG4gICAgICAgIHVybDogJy9sb2dpbicsXHJcbiAgICAgICAgdGVtcGxhdGU6ICc8bG9naW4tcGFnZT48L2xvZ2luLXBhZ2U+JyxcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgIG5lZWRBdXRoOiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XSk7IiwiYW5ndWxhci5tb2R1bGUoJ21haWwubW9kdWxlJywgWydhcHAuY29uZmlnJywgJ3NoYXJlZC5tb2R1bGUnLCAndWkucm91dGVyJywgJ25nUmVzb3VyY2UnXSk7XHJcblxyXG5hbmd1bGFyLm1vZHVsZSgnbWFpbC5tb2R1bGUnKS5jb25maWcoWyckc3RhdGVQcm92aWRlcicsIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21haWxib3hlcycsIHtcclxuICAgICAgICB1cmw6ICcvbWFpbGJveGVzJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJzxtYWlscy1wYWdlPjwvbWFpbHMtcGFnZT4nLFxyXG4gICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgbmVlZEF1dGg6IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWFpbC1jcmVhdGUnLCB7XHJcbiAgICAgICAgdXJsOiAnL21haWwtY3JlYXRlJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJzxtYWlsLWNyZWF0ZS1wYWdlPjwvbWFpbC1jcmVhdGUtcGFnZT4nLFxyXG4gICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgbmVlZEF1dGg6IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWFpbGJveGVzLm1haWwtdGFibGUnLCB7XHJcbiAgICAgICAgdXJsOiAnLzptYWlsYm94SWQnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnPG1haWwtdGFibGUgbWFpbGJveC1pZD1cIm1haWxib3hJZFwiPjwvbWFpbC10YWJsZT4nLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRzdGF0ZVBhcmFtcycsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zKSB7XHJcbiAgICAgICAgICAgICRzY29wZS5tYWlsYm94SWQgPSAkc3RhdGVQYXJhbXMubWFpbGJveElkO1xyXG4gICAgICAgIH1dLFxyXG4gICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgbmVlZEF1dGg6IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWFpbGJveGVzLm1haWwtaXRlbS1kZXRhaWxlZCcsIHtcclxuICAgICAgICB1cmw6ICcvOm1haWxib3hJZC9tYWlsLzpsZXR0ZXJJZCcsXHJcbiAgICAgICAgdGVtcGxhdGU6ICc8bWFpbC1kZXRhaWxlZCBtYWlsYm94LWlkPVwibWFpbGJveElkXCIgbGV0dGVyLWlkPVwibGV0dGVySWRcIj48L21haWwtZGV0YWlsZWQ+JyxcclxuICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICckc3RhdGVQYXJhbXMnLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcykge1xyXG4gICAgICAgICAgICAkc2NvcGUubWFpbGJveElkID0gJHN0YXRlUGFyYW1zLm1haWxib3hJZDtcclxuICAgICAgICAgICAgJHNjb3BlLmxldHRlcklkID0gJHN0YXRlUGFyYW1zLmxldHRlcklkO1xyXG4gICAgICAgIH1dLFxyXG4gICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgbmVlZEF1dGg6IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufV0pO1xyXG5cclxuXHJcbiIsImFuZ3VsYXIubW9kdWxlKCdtYWluLm1vZHVsZScsIFsnYXBwLmNvbmZpZycsICdzaGFyZWQubW9kdWxlJywgJ3VpLnJvdXRlciddKTtcclxuXHJcblxyXG4iLCJhbmd1bGFyLm1vZHVsZSgndXNlci5tb2R1bGUnLCBbJ2FwcC5jb25maWcnLCAnc2hhcmVkLm1vZHVsZScsICd1aS5yb3V0ZXInLCAncmVzdGFuZ3VsYXInXSk7XHJcblxyXG5hbmd1bGFyLm1vZHVsZSgndXNlci5tb2R1bGUnKS5jb25maWcoWydSZXN0YW5ndWxhclByb3ZpZGVyJywgJyRzdGF0ZVByb3ZpZGVyJywgJ1JFU1RfVVJMJyxcclxuICAgIGZ1bmN0aW9uKFJlc3Rhbmd1bGFyUHJvdmlkZXIsICRzdGF0ZVByb3ZpZGVyLCBSRVNUX1VSTCkge1xyXG4gICAgUmVzdGFuZ3VsYXJQcm92aWRlci5zZXRCYXNlVXJsKFJFU1RfVVJMKTtcclxuICAgIFJlc3Rhbmd1bGFyUHJvdmlkZXIuc2V0UmVzdGFuZ3VsYXJGaWVsZHMoeyBpZDogXCJfaWRcIiB9KTtcclxuXHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgndXNlcnMnLCB7XHJcbiAgICAgICAgdXJsOiAnL3VzZXJzJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJzx1c2Vycy1wYWdlPjwvdXNlcnMtcGFnZT4nLFxyXG4gICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgbmVlZEF1dGg6IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgndXNlcnMudXNlci1kZXRhaWxlZCcsIHtcclxuICAgICAgICB1cmw6ICcvdXNlci86dXNlcklkJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJzx1c2VyLWl0ZW0tZGV0YWlsZWQgdXNlci1pZCA9IFwidXNlcklkXCIgPjwvdXNlci1pdGVtLWRldGFpbGVkPicsXHJcbiAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnJHN0YXRlUGFyYW1zJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMpIHtcclxuICAgICAgICAgICAgJHNjb3BlLnVzZXJJZCA9ICRzdGF0ZVBhcmFtcy51c2VySWQ7XHJcbiAgICAgICAgfV0sXHJcbiAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICBuZWVkQXV0aDogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCd1c2Vycy51c2VyLWVkaXQnLCB7XHJcbiAgICAgICAgdXJsOiAnL3VzZXItZWRpdC86dXNlcklkJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJzx1c2VyLWl0ZW0tZWRpdCB1c2VyLWlkID0gXCJ1c2VySWRcIiA+PC91c2VyLWl0ZW0tZWRpdD4nLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRzdGF0ZVBhcmFtcycsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zKSB7XHJcbiAgICAgICAgICAgICRzY29wZS51c2VySWQgPSAkc3RhdGVQYXJhbXMudXNlcklkO1xyXG4gICAgICAgIH1dLFxyXG4gICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgbmVlZEF1dGg6IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgndXNlcnMudXNlci1uZXcnLCB7XHJcbiAgICAgICAgdXJsOiAnL3VzZXItbmV3JyxcclxuICAgICAgICB0ZW1wbGF0ZTogJzx1c2VyLWl0ZW0tZWRpdD48L3VzZXItaXRlbS1lZGl0PicsXHJcbiAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICBuZWVkQXV0aDogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XSk7XHJcblxyXG5cclxuIiwidmFyIHRlc3QgPSBcImV4Y2x1ZGUgdGhpc1wiO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnbWFpbi5tb2R1bGUnKS5jb21wb25lbnQoJ21haW5MYXlvdXQnLCAge1xyXG4gICAgdGVtcGxhdGVVcmw6ICdtYWluL21haW4tbGF5b3V0LmNvbXBvbmVudC5odG1sJyxcclxuICAgIGNvbnRyb2xsZXI6IFsnJHN0YXRlJywgJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24oJHN0YXRlLCBBdXRoU2VydmljZSkge1xyXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpO1xyXG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRBdXRoZW50aWNhdGVkVXNlciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuZ2V0QXV0aGVudGljYXRlZFVzZXIoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1dXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnaG9tZS5tb2R1bGUnKS5jb21wb25lbnQoJ2hvbWVQYWdlJywgIHtcclxuICAgIHRlbXBsYXRlVXJsOiAnaG9tZS9ob21lLXBhZ2UvaG9tZS1wYWdlLmNvbXBvbmVudC5odG1sJ1xyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnbG9naW4ubW9kdWxlJykuY29tcG9uZW50KCdsb2dpblBhZ2UnLCB7XHJcbiAgICB0ZW1wbGF0ZVVybDogJ2xvZ2luL2xvZ2luLXBhZ2UvbG9naW4tcGFnZS5jb21wb25lbnQuaHRtbCcgLFxyXG4gICAgY29udHJvbGxlcjogWyckc3RhdGUnLCAnQXV0aFNlcnZpY2UnLCAnU3RhdGVTZXJ2aWNlJywgZnVuY3Rpb24oJHN0YXRlLCBBdXRoU2VydmljZSwgU3RhdGVTZXJ2aWNlKSB7XHJcbiAgICAgICAgdmFyIGN0eCA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5zaG93RXJyb3IgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jcmVkZW50aWFscykge1xyXG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuYXV0aGVudGljYXRlKHRoaXMuY3JlZGVudGlhbHMudXNlcm5hbWUsIHRoaXMuY3JlZGVudGlhbHMucGFzc3dvcmQpLnRoZW4oZnVuY3Rpb24oaXNBdXRoZW50aWNhdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXV0aGVudGljYXRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJldmlvdXNTdGF0ZSA9IFN0YXRlU2VydmljZS5nZXRMb2dpblJlZGlyZWN0U3RhdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzU3RhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhwcmV2aW91c1N0YXRlLnN0YXRlLCBwcmV2aW91c1N0YXRlLnBhcmFtcywge3JlbG9hZDogdHJ1ZX0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdHguZXJyb3JNZXNzYWdlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXJyb3JNZXNzYWdlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XVxyXG59KTtcclxuXHJcbiIsImFuZ3VsYXIubW9kdWxlKCdtYWlsLm1vZHVsZScpLmNvbXBvbmVudCgnbWFpbENyZWF0ZVBhZ2UnLCB7XHJcbiAgICB0ZW1wbGF0ZVVybDogJ21haWwvbWFpbC1jcmVhdGUtcGFnZS9tYWlsLWNyZWF0ZS1wYWdlLmNvbXBvbmVudC5odG1sJyAsXHJcbiAgICBjb250cm9sbGVyOiBbJ01haWxib3hTZXJ2aWNlJywgJ0xldHRlclNlcnZpY2UnLCAnU3RhdGVTZXJ2aWNlJywgJyRzdGF0ZScsICckcScsXHJcbiAgICAgICAgZnVuY3Rpb24oTWFpbGJveFNlcnZpY2UsIExldHRlclNlcnZpY2UsIFN0YXRlU2VydmljZSwgJHN0YXRlLCAkcSkge1xyXG4gICAgICAgIHZhciBjdHggPSB0aGlzO1xyXG5cclxuICAgICAgICB0aGlzLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgcHJldmlvdXNTdGF0ZSA9IFN0YXRlU2VydmljZS5nZXRQcmV2aW91c1N0YXRlKCk7XHJcbiAgICAgICAgICAgICRzdGF0ZS5nbyhwcmV2aW91c1N0YXRlLnN0YXRlLCBwcmV2aW91c1N0YXRlLnBhcmFtcyk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5zYXZlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNhdmVNZXNzYWdlVG9NYWlsYm94KCdkcmFmdCcsIHRoaXMubWVzc2FnZSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5zZW5kID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzYXZlTWVzc2FnZVRvTWFpbGJveCgnb3V0Ym94JywgdGhpcy5tZXNzYWdlKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIGZ1bmN0aW9uIHNhdmVNZXNzYWdlVG9NYWlsYm94KG1haWxib3hUaXRsZSwgbWVzc2FnZSkge1xyXG4gICAgICAgICAgICBnZXRNYWlsYm94QnlUaXRsZShtYWlsYm94VGl0bGUpLnRoZW4oZnVuY3Rpb24obWFpbGJveCkge1xyXG4gICAgICAgICAgICAgICAgbWVzc2FnZS5tYWlsYm94ID0gbWFpbGJveC5faWQ7XHJcbiAgICAgICAgICAgICAgICBMZXR0ZXJTZXJ2aWNlLnNhdmUobWVzc2FnZSwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHByZXZpb3VzU3RhdGUgPSBTdGF0ZVNlcnZpY2UuZ2V0UHJldmlvdXNTdGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhwcmV2aW91c1N0YXRlLnN0YXRlLCBwcmV2aW91c1N0YXRlLnBhcmFtcyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGZ1bmN0aW9uIGdldE1haWxib3hCeVRpdGxlKHRpdGxlKSB7XHJcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBNYWlsYm94U2VydmljZS5xdWVyeShmdW5jdGlvbihtYWlsYm94ZXMpIHtcclxuICAgICAgICAgICAgICAgIHZhciBtYWlsYm94ID0gbWFpbGJveGVzLmZpbHRlcihmdW5jdGlvbihtYWlsYm94KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1haWxib3gudGl0bGUgPT09IHRpdGxlO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShtYWlsYm94WzBdKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICAgICAgICB9XHJcbiAgICB9XVxyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ21haWwubW9kdWxlJykuY29tcG9uZW50KCdtYWlsc1BhZ2UnLCAge1xyXG4gICAgdGVtcGxhdGVVcmw6ICdtYWlsL21haWxzLXBhZ2UvbWFpbHMtcGFnZS5jb21wb25lbnQuaHRtbCdcclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdtYWlsLm1vZHVsZScpLmZhY3RvcnkoJ0xldHRlclNlcnZpY2UnLCBbJyRyZXNvdXJjZScsICdSRVNUX1VSTCcsIGZ1bmN0aW9uICgkcmVzb3VyY2UsIFJFU1RfVVJMKSB7XHJcbiAgICByZXR1cm4gJHJlc291cmNlKFJFU1RfVVJMICsgJy9sZXR0ZXJzLzppZCcse1xyXG4gICAgICAgIGlkOiAnQF9pZCcsXHJcbiAgICB9KTtcclxufV0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnbWFpbC5tb2R1bGUnKS5mYWN0b3J5KCdNYWlsYm94U2VydmljZScsIFsnJHJlc291cmNlJywgJ1JFU1RfVVJMJywgZnVuY3Rpb24gKCRyZXNvdXJjZSwgUkVTVF9VUkwpIHtcclxuICAgIHJldHVybiAkcmVzb3VyY2UoUkVTVF9VUkwgKyAnL21haWxib3hlcy86aWQnLHtcclxuICAgICAgICBpZDogJ0BfaWQnLFxyXG4gICAgfSk7XHJcbn1dKTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ3NoYXJlZC5tb2R1bGUnKS5zZXJ2aWNlKCdBdXRoU2VydmljZScsIFsnJHEnLCBmdW5jdGlvbigkcSkge1xyXG5cclxuICAgIC8vIFRPRE8gOiBtYWtlIHJlYWwgUkVTVCByZXF1ZXN0XHJcblxyXG4gICAgdmFyIGF1dGhlbnRpY2F0ZWRVc2VyO1xyXG4gICAgdmFyIGlzQXV0aGVudGljYXRlZCA9IGZhbHNlO1xyXG5cclxuICAgIHRoaXMuYXV0aGVudGljYXRlID0gZnVuY3Rpb24obG9naW4sIHBhc3N3b3JkKSB7XHJcbiAgICAgICAgaWYgKGxvZ2luID09ICd0ZXN0JyAmJiBwYXNzd29yZCA9PSAndGVzdCcpIHtcclxuICAgICAgICAgICAgaXNBdXRoZW50aWNhdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgYXV0aGVudGljYXRlZFVzZXIgPSBsb2dpbjtcclxuICAgICAgICAgICAgcmV0dXJuICRxLnJlc29sdmUodHJ1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuICRxLnJlc29sdmUoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gaXNBdXRoZW50aWNhdGVkO1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmdldEF1dGhlbnRpY2F0ZWRVc2VyID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIGF1dGhlbnRpY2F0ZWRVc2VyO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgaXNBdXRoZW50aWNhdGVkID0gZmFsc2U7XHJcbiAgICAgICAgYXV0aGVudGljYXRlZFVzZXIgPSBudWxsO1xyXG4gICAgfTtcclxuXHJcbn1dKTsiLCJhbmd1bGFyLm1vZHVsZSgnc2hhcmVkLm1vZHVsZScpLmNvbXBvbmVudCgnaHR0cEFqYXhMb2FkSW5kaWNhdG9yJywgIHtcclxuICAgIHRlbXBsYXRlVXJsOiAnc2hhcmVkL2h0dHAtYWpheC1sb2FkLWluZGljYXRvci9odHRwLWFqYXgtbG9hZC1pbmRpY2F0b3IuY29tcG9uZW50Lmh0bWwnLFxyXG4gICAgY29udHJvbGxlcjogWyckc2NvcGUnLCBmdW5jdGlvbigkc2NvcGUpe1xyXG4gICAgICAgIHZhciBjdHggPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuc2hvd0xvYWRJbmRpY2F0b3IgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiRvbihcImxvYWRlcl9zaG93XCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgY3R4LnNob3dMb2FkSW5kaWNhdG9yID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiRvbihcImxvYWRlcl9oaWRlXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgY3R4LnNob3dMb2FkSW5kaWNhdG9yID0gZmFsc2U7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XVxyXG59KTtcclxuXHJcbiIsImFuZ3VsYXIubW9kdWxlKCdzaGFyZWQubW9kdWxlJykuZmFjdG9yeSgnSHR0cFJlcXVlc3RMb2FkSW5kaWNhdG9ySW50ZXJjZXB0b3InLCBbJyRxJywgJyRyb290U2NvcGUnLCBmdW5jdGlvbigkcSwgJHJvb3RTY29wZSkge1xyXG5cclxuICAgIHZhciBudW1Mb2FkaW5ncyA9IDA7XHJcblxyXG4gICAgdmFyIGh0dHBSZXF1ZXN0TG9hZEluZGljYXRvckludGVyY2VwdG9yID0ge1xyXG4gICAgICAgIHJlcXVlc3Q6IGZ1bmN0aW9uIChjb25maWcpIHtcclxuICAgICAgICAgICAgbnVtTG9hZGluZ3MrKztcclxuXHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChcImxvYWRlcl9zaG93XCIpO1xyXG4gICAgICAgICAgICByZXR1cm4gY29uZmlnIHx8ICRxLndoZW4oY29uZmlnKVxyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlc3BvbnNlOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgaWYgKCgtLW51bUxvYWRpbmdzKSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KFwibG9hZGVyX2hpZGVcIik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZSB8fCAkcS53aGVuKHJlc3BvbnNlKTtcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgaWYgKCEoLS1udW1Mb2FkaW5ncykpIHtcclxuICAgICAgICAgICAgICAgIC8vIEhpZGUgbG9hZGVyXHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoXCJsb2FkZXJfaGlkZVwiKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gaHR0cFJlcXVlc3RMb2FkSW5kaWNhdG9ySW50ZXJjZXB0b3I7XHJcblxyXG59XSk7XHJcblxyXG5cclxuIiwiYW5ndWxhci5tb2R1bGUoJ3NoYXJlZC5tb2R1bGUnKS5jb21wb25lbnQoJ2h0dHBTdGF0aWNMb2FkSW5kaWNhdG9yJywgIHtcclxuICAgIHRlbXBsYXRlVXJsOiAnc2hhcmVkL2h0dHAtYWpheC1sb2FkLWluZGljYXRvci9odHRwLXN0YXRpYy1sb2FkLWluZGljYXRvci5jb21wb25lbnQuaHRtbCdcclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdzaGFyZWQubW9kdWxlJykuZmFjdG9yeSgnSHR0cEVycm9ySW50ZXJjZXB0b3InLCBbJyRxJywgZnVuY3Rpb24oJHEpIHtcclxuICAgIHZhciBodHRwRXJyb3JJbnRlcmNlcHRvciA9IHtcclxuICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbihyZWplY3Rpb24pIHtcclxuICAgICAgICAgICAgaWYgKHJlamVjdGlvbi5zdGF0dXMgPT0gNDAxIHx8IHJlamVjdGlvbi5zdGF0dXMgPT0gNDA1KSB7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPIDogZ28gdG8gbG9naW5cclxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWplY3Rpb24uc3RhdHVzID09IDQwMykge1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyA6IGdvIHRvIHByZXZpb3VzIHN0YXRlXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVqZWN0aW9uLnN0YXR1cyA9PSA0MDQpIHtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8gOiBnbyB0byBob21lXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPIDogc2hvdyBlcnJvclxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlamVjdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gaHR0cEVycm9ySW50ZXJjZXB0b3I7XHJcbn1dKTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ3NoYXJlZC5tb2R1bGUnKS5zZXJ2aWNlKCdTdGF0ZVNlcnZpY2UnLCBmdW5jdGlvbigpIHtcclxuXHJcbiAgICB2YXIgbG9naW5SZWRpcmVjdFN0YXRlO1xyXG4gICAgdmFyIHByZXZpb3VzU3RhdGU7XHJcblxyXG4gICAgdGhpcy5zZXRMb2dpblJlZGlyZWN0U3RhdGUgPSBmdW5jdGlvbihzdGF0ZSwgcGFyYW1zKSB7XHJcbiAgICAgICAgbG9naW5SZWRpcmVjdFN0YXRlID0geyBzdGF0ZTogc3RhdGUsIHBhcmFtczogcGFyYW1zIH07XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuZ2V0TG9naW5SZWRpcmVjdFN0YXRlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIGxvZ2luUmVkaXJlY3RTdGF0ZTtcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5zZXRQcmV2aW91c1N0YXRlID0gZnVuY3Rpb24oc3RhdGUsIHBhcmFtcykge1xyXG4gICAgICAgIHByZXZpb3VzU3RhdGUgPSB7IHN0YXRlOiBzdGF0ZSwgcGFyYW1zOiBwYXJhbXMgfTtcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5nZXRQcmV2aW91c1N0YXRlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzU3RhdGU7XHJcbiAgICB9O1xyXG5cclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCd1c2VyLm1vZHVsZScpLnNlcnZpY2UoJ1VzZXJTZXJ2aWNlJywgWyckcScsICdSZXN0YW5ndWxhcicsIGZ1bmN0aW9uKCRxLCBSZXN0YW5ndWxhcikge1xyXG5cclxuICAgIHRoaXMuZ2V0QWxsID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLmFsbCgndXNlcnMnKS5nZXRMaXN0KCk7XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuZ2V0T25lID0gZnVuY3Rpb24odXNlcklkKSB7XHJcbiAgICAgICAgcmV0dXJuIFJlc3Rhbmd1bGFyLm9uZSgndXNlcnMnLCB1c2VySWQpLmdldCgpO1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKHVzZXIpIHtcclxuICAgICAgICByZXR1cm4gdXNlci5yZW1vdmUoKTtcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5zYXZlID0gZnVuY3Rpb24odXNlcikge1xyXG4gICAgICAgIGlmICh1c2VyLl9pZCkge1xyXG4gICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cclxuICAgICAgICAgICAgdXNlci5yZW1vdmUoKS50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgUmVzdGFuZ3VsYXIuYWxsKCd1c2VycycpLnBvc3QodXNlcikudGhlbihmdW5jdGlvbih1c2VyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh1c2VyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5hbGwoJ3VzZXJzJykucG9zdCh1c2VyKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxufV0pOyIsImFuZ3VsYXIubW9kdWxlKCd1c2VyLm1vZHVsZScpLmNvbXBvbmVudCgndXNlcnNQYWdlJywgIHtcclxuICAgIHRlbXBsYXRlVXJsOiAndXNlci91c2Vycy1wYWdlL3VzZXJzLXBhZ2UuY29tcG9uZW50Lmh0bWwnXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnbWFpbC5tb2R1bGUnKS5jb21wb25lbnQoJ21haWxEZXRhaWxlZCcsIHtcclxuICAgICAgICBiaW5kaW5nczoge1xyXG4gICAgICAgICAgICBsZXR0ZXJJZDogJzwnLFxyXG4gICAgICAgICAgICBtYWlsYm94SWQ6ICc8J1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdtYWlsL21haWxzLXBhZ2UvbWFpbC1kZXRhaWxlZC9tYWlsLWRldGFpbGVkLmNvbXBvbmVudC5odG1sJyAsXHJcbiAgICAgICAgY29udHJvbGxlcjogWydMZXR0ZXJTZXJ2aWNlJywgJyRzdGF0ZScsIGZ1bmN0aW9uKExldHRlclNlcnZpY2UsICRzdGF0ZSkge1xyXG4gICAgICAgICAgICB2YXIgY3R4ID0gdGhpcztcclxuICAgICAgICAgICAgTGV0dGVyU2VydmljZS5nZXQoeyBpZCA6IHRoaXMubGV0dGVySWR9LCBmdW5jdGlvbihsZXR0ZXIpIHtcclxuICAgICAgICAgICAgICAgIGN0eC5sZXR0ZXIgPSBsZXR0ZXI7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5nb0JhY2sgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbWFpbGJveGVzLm1haWwtdGFibGUnLCB7IG1haWxib3hJZDogY3R4Lm1haWxib3hJZCB9KTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZGVsZXRlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBjdHgubGV0dGVyLiRkZWxldGUoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdtYWlsYm94ZXMubWFpbC10YWJsZScsIHsgbWFpbGJveElkOiBjdHgubWFpbGJveElkIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfV1cclxuICAgIH0pOyIsImFuZ3VsYXIubW9kdWxlKCdtYWlsLm1vZHVsZScpLmNvbXBvbmVudCgnbWFpbFRhYmxlJywge1xyXG4gICAgICAgIGJpbmRpbmdzOiB7XHJcbiAgICAgICAgICAgIG1haWxib3hJZDogJzwnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdtYWlsL21haWxzLXBhZ2UvbWFpbC10YWJsZS9tYWlsLXRhYmxlLmNvbXBvbmVudC5odG1sJyxcclxuICAgICAgICBjb250cm9sbGVyOiBbJ0xldHRlclNlcnZpY2UnLCBmdW5jdGlvbihMZXR0ZXJTZXJ2aWNlKXtcclxuICAgICAgICAgICAgdmFyIGN0eCA9IHRoaXM7XHJcbiAgICAgICAgICAgIExldHRlclNlcnZpY2UucXVlcnkoZnVuY3Rpb24obGV0dGVycykge1xyXG4gICAgICAgICAgICAgICAgY3R4LmxldHRlcnMgPSBsZXR0ZXJzLmZpbHRlcihmdW5jdGlvbihsZXR0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGV0dGVyLm1haWxib3ggPT09IGN0eC5tYWlsYm94SWQ7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfV1cclxuICAgIH0pOyIsImFuZ3VsYXIubW9kdWxlKCdtYWlsLm1vZHVsZScpLmNvbXBvbmVudCgnbWFpbGJveExpc3QnLCAge1xyXG4gICAgdGVtcGxhdGVVcmw6ICdtYWlsL21haWxzLXBhZ2UvbWFpbGJveC1saXN0L21haWxib3gtbGlzdC5jb21wb25lbnQuaHRtbCcsXHJcbiAgICBjb250cm9sbGVyOiBbJ01haWxib3hTZXJ2aWNlJywgJyRzdGF0ZScsIGZ1bmN0aW9uKE1haWxib3hTZXJ2aWNlLCAkc3RhdGUpe1xyXG4gICAgICAgIHZhciBjdHggPSB0aGlzO1xyXG4gICAgICAgIE1haWxib3hTZXJ2aWNlLnF1ZXJ5KGZ1bmN0aW9uKG1haWxib3hlcykge1xyXG4gICAgICAgICAgICBjdHgubWFpbGJveGVzID0gbWFpbGJveGVzO1xyXG4gICAgICAgICAgICBpZiAobWFpbGJveGVzICYmIG1haWxib3hlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ21haWxib3hlcy5tYWlsLXRhYmxlJywgeyBtYWlsYm94SWQ6IG1haWxib3hlc1swXS5faWQgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1dXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgndXNlci5tb2R1bGUnKS5jb21wb25lbnQoJ3VzZXJJdGVtRGV0YWlsZWQnLCAge1xyXG4gICAgYmluZGluZ3M6IHtcclxuICAgICAgICB1c2VySWQ6IFwiPFwiXHJcbiAgICB9LFxyXG4gICAgdGVtcGxhdGVVcmw6ICd1c2VyL3VzZXJzLXBhZ2UvdXNlci1pdGVtLWRldGFpbGVkL3VzZXItaXRlbS1kZXRhaWxlZC5jb21wb25lbnQuaHRtbCcsXHJcbiAgICBjb250cm9sbGVyOiBbJ1VzZXJTZXJ2aWNlJywgJyRzdGF0ZScsIGZ1bmN0aW9uKFVzZXJTZXJ2aWNlLCAkc3RhdGUpe1xyXG4gICAgICAgIHZhciBjdHggPSB0aGlzO1xyXG5cclxuICAgICAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBVc2VyU2VydmljZS5kZWxldGUodGhpcy51c2VyKS50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCd1c2VycycsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIFVzZXJTZXJ2aWNlLmdldE9uZSh0aGlzLnVzZXJJZCkudGhlbihmdW5jdGlvbih1c2VyKSB7XHJcbiAgICAgICAgICAgIGN0eC51c2VyID0gdXNlcjtcclxuICAgICAgICB9KTtcclxuICAgIH1dXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgndXNlci5tb2R1bGUnKS5jb21wb25lbnQoJ3VzZXJJdGVtRWRpdCcsICB7XHJcbiAgICBiaW5kaW5nczoge1xyXG4gICAgICAgIHVzZXJJZDogXCI8XCJcclxuICAgIH0sXHJcbiAgICB0ZW1wbGF0ZVVybDogJ3VzZXIvdXNlcnMtcGFnZS91c2VyLWl0ZW0tZWRpdC91c2VyLWl0ZW0tZWRpdC5jb21wb25lbnQuaHRtbCcsXHJcbiAgICBjb250cm9sbGVyOiBbJ1VzZXJTZXJ2aWNlJywgJyRzdGF0ZScsIGZ1bmN0aW9uKFVzZXJTZXJ2aWNlLCAkc3RhdGUpe1xyXG4gICAgICAgIHZhciBjdHggPSB0aGlzO1xyXG5cclxuICAgICAgICB0aGlzLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy51c2VySWQpIHtcclxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygndXNlcnMudXNlci1kZXRhaWxlZCcsIHt1c2VySWQ6IHRoaXMudXNlcklkfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ3VzZXJzJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBVc2VyU2VydmljZS5kZWxldGUodGhpcy51c2VyKS50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCd1c2VycycsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuc2F2ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBVc2VyU2VydmljZS5zYXZlKHRoaXMudXNlcikudGhlbihmdW5jdGlvbih1c2VyKSB7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ3VzZXJzLnVzZXItZGV0YWlsZWQnLCB7dXNlcklkOiB1c2VyLl9pZCB9LCB7cmVsb2FkOiB0cnVlfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnVzZXJJZCkge1xyXG4gICAgICAgICAgICBVc2VyU2VydmljZS5nZXRPbmUodGhpcy51c2VySWQpLnRoZW4oZnVuY3Rpb24odXNlcikge1xyXG4gICAgICAgICAgICAgICAgY3R4LnVzZXIgPSB1c2VyO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XVxyXG59KTtcclxuXHJcbiIsImFuZ3VsYXIubW9kdWxlKCd1c2VyLm1vZHVsZScpLmNvbXBvbmVudCgndXNlckxpc3QnLCAge1xyXG4gICAgdGVtcGxhdGVVcmw6ICd1c2VyL3VzZXJzLXBhZ2UvdXNlci1saXN0L3VzZXItbGlzdC5jb21wb25lbnQuaHRtbCcsXHJcbiAgICBjb250cm9sbGVyOiBbJ1Jlc3Rhbmd1bGFyJywgZnVuY3Rpb24oUmVzdGFuZ3VsYXIpe1xyXG4gICAgICAgIHZhciBjdHggPSB0aGlzO1xyXG4gICAgICAgIFJlc3Rhbmd1bGFyLmFsbCgndXNlcnMnKS5nZXRMaXN0KCkudGhlbihmdW5jdGlvbih1c2Vycykge1xyXG4gICAgICAgICAgICBjdHgudXNlcnMgPSB1c2VycztcclxuICAgICAgICB9KTtcclxuICAgIH1dXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnbWFpbEFwcCcsIFsnc2hhcmVkLm1vZHVsZScsICdtYWluLm1vZHVsZScsICdob21lLm1vZHVsZScsICdsb2dpbi5tb2R1bGUnLCAndXNlci5tb2R1bGUnLCAnbWFpbC5tb2R1bGUnLCAndWkucm91dGVyJ10pO1xyXG5cclxuYW5ndWxhci5tb2R1bGUoJ21haWxBcHAnKS5jb25maWcoWyckdXJsUm91dGVyUHJvdmlkZXInLCBmdW5jdGlvbigkdXJsUm91dGVyUHJvdmlkZXIpIHtcclxuICAgICR1cmxSb3V0ZXJQcm92aWRlclxyXG4gICAgICAgIC5vdGhlcndpc2UoJy9ob21lJyk7XHJcbn1dKTsiXX0=
