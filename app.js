angular.module("app.config", [])
.constant("REST_URL", "https://test-api.javascript.ru/v1/abazhenau");

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC1jb25maWcuanMiLCJzaGFyZWQvc2hhcmVkLm1vZHVsZS5qcyIsImhvbWUvaG9tZS5tb2R1bGUuanMiLCJsb2dpbi9sb2dpbi5tb2R1bGUuanMiLCJtYWlsL21haWwubW9kdWxlLmpzIiwibWFpbi9tYWluLm1vZHVsZS5qcyIsInVzZXIvdXNlci5tb2R1bGUuanMiLCJtYWlsL2V4YW1wbGUuc3BlYy5qcyIsIm1haW4vbWFpbi1sYXlvdXQuY29tcG9uZW50LmpzIiwiaG9tZS9ob21lLXBhZ2UvaG9tZS1wYWdlLmNvbXBvbmVudC5qcyIsImxvZ2luL2xvZ2luLXBhZ2UvbG9naW4tcGFnZS5jb21wb25lbnQuanMiLCJtYWlsL21haWwtY3JlYXRlLXBhZ2UvbWFpbC1jcmVhdGUtcGFnZS5jb21wb25lbnQuanMiLCJtYWlsL21haWxzLXBhZ2UvbWFpbHMtcGFnZS5jb21wb25lbnQuanMiLCJtYWlsL3NlcnZpY2UvbGV0dGVyLnNlcnZpY2UuanMiLCJtYWlsL3NlcnZpY2UvbWFpbGJveC5zZXJ2aWNlLmpzIiwic2hhcmVkL2F1dGgtc2VydmljZS9hdXRoLnNlcnZpY2UuanMiLCJzaGFyZWQvaHR0cC1hamF4LWxvYWQtaW5kaWNhdG9yL2h0dHAtYWpheC1sb2FkLWluZGljYXRvci5jb21wb25lbnQuanMiLCJzaGFyZWQvaHR0cC1hamF4LWxvYWQtaW5kaWNhdG9yL2h0dHAtcmVxdWVzdC1sb2FkLWluZGljYXRvci1pbnRlcmNlcHRvci5qcyIsInNoYXJlZC9odHRwLWFqYXgtbG9hZC1pbmRpY2F0b3IvaHR0cC1zdGF0aWMtbG9hZC1pbmRpY2F0b3IuY29tcG9uZW50LmpzIiwic2hhcmVkL2h0dHAtZXJyb3ItaGFuZGxlci9odHRwLWVycm9yLWludGVyY2VwdG9yLmpzIiwic2hhcmVkL3N0YXRlLXNlcnZpY2Uvc3RhdGUuc2VydmljZS5qcyIsInVzZXIvc2VydmljZS91c2VyLnNlcnZpY2UuanMiLCJ1c2VyL3VzZXJzLXBhZ2UvdXNlcnMtcGFnZS5jb21wb25lbnQuanMiLCJtYWlsL21haWxzLXBhZ2UvbWFpbC1kZXRhaWxlZC9tYWlsLWRldGFpbGVkLmNvbXBvbmVudC5qcyIsIm1haWwvbWFpbHMtcGFnZS9tYWlsLXRhYmxlL21haWwtdGFibGUuY29tcG9uZW50LmpzIiwibWFpbC9tYWlscy1wYWdlL21haWxib3gtbGlzdC9tYWlsYm94LWxpc3QuY29tcG9uZW50LmpzIiwidXNlci91c2Vycy1wYWdlL3VzZXItaXRlbS1kZXRhaWxlZC91c2VyLWl0ZW0tZGV0YWlsZWQuY29tcG9uZW50LmpzIiwidXNlci91c2Vycy1wYWdlL3VzZXItaXRlbS1lZGl0L3VzZXItaXRlbS1lZGl0LmNvbXBvbmVudC5qcyIsInVzZXIvdXNlcnMtcGFnZS91c2VyLWxpc3QvdXNlci1saXN0LmNvbXBvbmVudC5qcyIsImFwcC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0NBO0FBQ0E7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoXCJhcHAuY29uZmlnXCIsIFtdKVxuLmNvbnN0YW50KFwiUkVTVF9VUkxcIiwgXCJodHRwczovL3Rlc3QtYXBpLmphdmFzY3JpcHQucnUvdjEvYWJhemhlbmF1XCIpO1xuIiwiYW5ndWxhci5tb2R1bGUoJ3NoYXJlZC5tb2R1bGUnLCBbJ2FwcC5jb25maWcnXSk7XHJcblxyXG5hbmd1bGFyLm1vZHVsZSgnc2hhcmVkLm1vZHVsZScpLmNvbmZpZyhbJyRodHRwUHJvdmlkZXInLCBmdW5jdGlvbigkaHR0cFByb3ZpZGVyKSB7XHJcbiAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdIdHRwRXJyb3JJbnRlcmNlcHRvcicpO1xyXG4gICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaCgnSHR0cFJlcXVlc3RMb2FkSW5kaWNhdG9ySW50ZXJjZXB0b3InKTtcclxufV0pO1xyXG5cclxuYW5ndWxhci5tb2R1bGUoJ3NoYXJlZC5tb2R1bGUnKS5ydW4oWyckcm9vdFNjb3BlJywgJyRzdGF0ZScsICdBdXRoU2VydmljZScsICdTdGF0ZVNlcnZpY2UnLFxyXG4gICAgZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCBBdXRoU2VydmljZSwgU3RhdGVTZXJ2aWNlKSB7XHJcbiAgICAgICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oZSwgdG9TdGF0ZSwgdG9QYXJhbXMsIGZyb21TdGF0ZSwgZnJvbVBhcmFtcykge1xyXG4gICAgICAgICAgICBpZiAodG9TdGF0ZS5kYXRhLm5lZWRBdXRoICYmICFBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgU3RhdGVTZXJ2aWNlLnNldExvZ2luUmVkaXJlY3RTdGF0ZSh0b1N0YXRlLCB0b1BhcmFtcyk7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBTdGF0ZVNlcnZpY2Uuc2V0UHJldmlvdXNTdGF0ZShmcm9tU3RhdGUsIGZyb21QYXJhbXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XSk7IiwiYW5ndWxhci5tb2R1bGUoJ2hvbWUubW9kdWxlJywgWydhcHAuY29uZmlnJywgJ3NoYXJlZC5tb2R1bGUnLCAndWkucm91dGVyJ10pO1xyXG5cclxuYW5ndWxhci5tb2R1bGUoJ2hvbWUubW9kdWxlJykuY29uZmlnKFsnJHN0YXRlUHJvdmlkZXInLCBmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XHJcbiAgICAgICAgdXJsOiAnL2hvbWUnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnPGhvbWUtcGFnZT48L2hvbWUtcGFnZT4nLFxyXG4gICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgbmVlZEF1dGg6IGZhbHNlXHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1dKTtcclxuXHJcblxyXG4iLCJhbmd1bGFyLm1vZHVsZSgnbG9naW4ubW9kdWxlJywgWydhcHAuY29uZmlnJywgJ3NoYXJlZC5tb2R1bGUnLCAndWkucm91dGVyJ10pO1xyXG5cclxuYW5ndWxhci5tb2R1bGUoJ2xvZ2luLm1vZHVsZScpLmNvbmZpZyhbJyRzdGF0ZVByb3ZpZGVyJywgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcclxuICAgICAgICB1cmw6ICcvbG9naW4nLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnPGxvZ2luLXBhZ2U+PC9sb2dpbi1wYWdlPicsXHJcbiAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICBuZWVkQXV0aDogZmFsc2VcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufV0pOyIsImFuZ3VsYXIubW9kdWxlKCdtYWlsLm1vZHVsZScsIFsnYXBwLmNvbmZpZycsICdzaGFyZWQubW9kdWxlJywgJ3VpLnJvdXRlcicsICduZ1Jlc291cmNlJ10pO1xyXG5cclxuYW5ndWxhci5tb2R1bGUoJ21haWwubW9kdWxlJykuY29uZmlnKFsnJHN0YXRlUHJvdmlkZXInLCBmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xyXG5cclxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtYWlsYm94ZXMnLCB7XHJcbiAgICAgICAgdXJsOiAnL21haWxib3hlcycsXHJcbiAgICAgICAgdGVtcGxhdGU6ICc8bWFpbHMtcGFnZT48L21haWxzLXBhZ2U+JyxcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgIG5lZWRBdXRoOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21haWwtY3JlYXRlJywge1xyXG4gICAgICAgIHVybDogJy9tYWlsLWNyZWF0ZScsXHJcbiAgICAgICAgdGVtcGxhdGU6ICc8bWFpbC1jcmVhdGUtcGFnZT48L21haWwtY3JlYXRlLXBhZ2U+JyxcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgIG5lZWRBdXRoOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21haWxib3hlcy5tYWlsLXRhYmxlJywge1xyXG4gICAgICAgIHVybDogJy86bWFpbGJveElkJyxcclxuICAgICAgICB0ZW1wbGF0ZTogJzxtYWlsLXRhYmxlIG1haWxib3gtaWQ9XCJtYWlsYm94SWRcIj48L21haWwtdGFibGU+JyxcclxuICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICckc3RhdGVQYXJhbXMnLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcykge1xyXG4gICAgICAgICAgICAkc2NvcGUubWFpbGJveElkID0gJHN0YXRlUGFyYW1zLm1haWxib3hJZDtcclxuICAgICAgICB9XSxcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgIG5lZWRBdXRoOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21haWxib3hlcy5tYWlsLWl0ZW0tZGV0YWlsZWQnLCB7XHJcbiAgICAgICAgdXJsOiAnLzptYWlsYm94SWQvbWFpbC86bGV0dGVySWQnLFxyXG4gICAgICAgIHRlbXBsYXRlOiAnPG1haWwtZGV0YWlsZWQgbWFpbGJveC1pZD1cIm1haWxib3hJZFwiIGxldHRlci1pZD1cImxldHRlcklkXCI+PC9tYWlsLWRldGFpbGVkPicsXHJcbiAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnJHN0YXRlUGFyYW1zJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMpIHtcclxuICAgICAgICAgICAgJHNjb3BlLm1haWxib3hJZCA9ICRzdGF0ZVBhcmFtcy5tYWlsYm94SWQ7XHJcbiAgICAgICAgICAgICRzY29wZS5sZXR0ZXJJZCA9ICRzdGF0ZVBhcmFtcy5sZXR0ZXJJZDtcclxuICAgICAgICB9XSxcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgIG5lZWRBdXRoOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1dKTtcclxuXHJcblxyXG4iLCJhbmd1bGFyLm1vZHVsZSgnbWFpbi5tb2R1bGUnLCBbJ2FwcC5jb25maWcnLCAnc2hhcmVkLm1vZHVsZScsICd1aS5yb3V0ZXInXSk7XHJcblxyXG5cclxuIiwiYW5ndWxhci5tb2R1bGUoJ3VzZXIubW9kdWxlJywgWydhcHAuY29uZmlnJywgJ3NoYXJlZC5tb2R1bGUnLCAndWkucm91dGVyJywgJ3Jlc3Rhbmd1bGFyJ10pO1xyXG5cclxuYW5ndWxhci5tb2R1bGUoJ3VzZXIubW9kdWxlJykuY29uZmlnKFsnUmVzdGFuZ3VsYXJQcm92aWRlcicsICckc3RhdGVQcm92aWRlcicsICdSRVNUX1VSTCcsXHJcbiAgICBmdW5jdGlvbihSZXN0YW5ndWxhclByb3ZpZGVyLCAkc3RhdGVQcm92aWRlciwgUkVTVF9VUkwpIHtcclxuICAgIFJlc3Rhbmd1bGFyUHJvdmlkZXIuc2V0QmFzZVVybChSRVNUX1VSTCk7XHJcbiAgICBSZXN0YW5ndWxhclByb3ZpZGVyLnNldFJlc3Rhbmd1bGFyRmllbGRzKHsgaWQ6IFwiX2lkXCIgfSk7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3VzZXJzJywge1xyXG4gICAgICAgIHVybDogJy91c2VycycsXHJcbiAgICAgICAgdGVtcGxhdGU6ICc8dXNlcnMtcGFnZT48L3VzZXJzLXBhZ2U+JyxcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgIG5lZWRBdXRoOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3VzZXJzLnVzZXItZGV0YWlsZWQnLCB7XHJcbiAgICAgICAgdXJsOiAnL3VzZXIvOnVzZXJJZCcsXHJcbiAgICAgICAgdGVtcGxhdGU6ICc8dXNlci1pdGVtLWRldGFpbGVkIHVzZXItaWQgPSBcInVzZXJJZFwiID48L3VzZXItaXRlbS1kZXRhaWxlZD4nLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRzdGF0ZVBhcmFtcycsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zKSB7XHJcbiAgICAgICAgICAgICRzY29wZS51c2VySWQgPSAkc3RhdGVQYXJhbXMudXNlcklkO1xyXG4gICAgICAgIH1dLFxyXG4gICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgbmVlZEF1dGg6IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgndXNlcnMudXNlci1lZGl0Jywge1xyXG4gICAgICAgIHVybDogJy91c2VyLWVkaXQvOnVzZXJJZCcsXHJcbiAgICAgICAgdGVtcGxhdGU6ICc8dXNlci1pdGVtLWVkaXQgdXNlci1pZCA9IFwidXNlcklkXCIgPjwvdXNlci1pdGVtLWVkaXQ+JyxcclxuICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICckc3RhdGVQYXJhbXMnLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcykge1xyXG4gICAgICAgICAgICAkc2NvcGUudXNlcklkID0gJHN0YXRlUGFyYW1zLnVzZXJJZDtcclxuICAgICAgICB9XSxcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgIG5lZWRBdXRoOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3VzZXJzLnVzZXItbmV3Jywge1xyXG4gICAgICAgIHVybDogJy91c2VyLW5ldycsXHJcbiAgICAgICAgdGVtcGxhdGU6ICc8dXNlci1pdGVtLWVkaXQ+PC91c2VyLWl0ZW0tZWRpdD4nLFxyXG4gICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgbmVlZEF1dGg6IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufV0pO1xyXG5cclxuXHJcbiIsInZhciB0ZXN0ID0gXCJleGNsdWRlIHRoaXNcIjtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ21haW4ubW9kdWxlJykuY29tcG9uZW50KCdtYWluTGF5b3V0JywgIHtcclxuICAgIHRlbXBsYXRlVXJsOiAnbWFpbi9tYWluLWxheW91dC5jb21wb25lbnQuaHRtbCcsXHJcbiAgICBjb250cm9sbGVyOiBbJyRzdGF0ZScsICdBdXRoU2VydmljZScsIGZ1bmN0aW9uKCRzdGF0ZSwgQXV0aFNlcnZpY2UpIHtcclxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKTtcclxuICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0QXV0aGVudGljYXRlZFVzZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmdldEF1dGhlbnRpY2F0ZWRVc2VyKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcclxuICAgICAgICB9XHJcbiAgICB9XVxyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ2hvbWUubW9kdWxlJykuY29tcG9uZW50KCdob21lUGFnZScsICB7XHJcbiAgICB0ZW1wbGF0ZVVybDogJ2hvbWUvaG9tZS1wYWdlL2hvbWUtcGFnZS5jb21wb25lbnQuaHRtbCdcclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ2xvZ2luLm1vZHVsZScpLmNvbXBvbmVudCgnbG9naW5QYWdlJywge1xyXG4gICAgdGVtcGxhdGVVcmw6ICdsb2dpbi9sb2dpbi1wYWdlL2xvZ2luLXBhZ2UuY29tcG9uZW50Lmh0bWwnICxcclxuICAgIGNvbnRyb2xsZXI6IFsnJHN0YXRlJywgJ0F1dGhTZXJ2aWNlJywgJ1N0YXRlU2VydmljZScsIGZ1bmN0aW9uKCRzdGF0ZSwgQXV0aFNlcnZpY2UsIFN0YXRlU2VydmljZSkge1xyXG4gICAgICAgIHZhciBjdHggPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuc2hvd0Vycm9yID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3JlZGVudGlhbHMpIHtcclxuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmF1dGhlbnRpY2F0ZSh0aGlzLmNyZWRlbnRpYWxzLnVzZXJuYW1lLCB0aGlzLmNyZWRlbnRpYWxzLnBhc3N3b3JkKS50aGVuKGZ1bmN0aW9uKGlzQXV0aGVudGljYXRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0F1dGhlbnRpY2F0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByZXZpb3VzU3RhdGUgPSBTdGF0ZVNlcnZpY2UuZ2V0TG9naW5SZWRpcmVjdFN0YXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c1N0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28ocHJldmlvdXNTdGF0ZS5zdGF0ZSwgcHJldmlvdXNTdGF0ZS5wYXJhbXMsIHtyZWxvYWQ6IHRydWV9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmVycm9yTWVzc2FnZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmVycm9yTWVzc2FnZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfV1cclxufSk7XHJcblxyXG4iLCJhbmd1bGFyLm1vZHVsZSgnbWFpbC5tb2R1bGUnKS5jb21wb25lbnQoJ21haWxDcmVhdGVQYWdlJywge1xyXG4gICAgdGVtcGxhdGVVcmw6ICdtYWlsL21haWwtY3JlYXRlLXBhZ2UvbWFpbC1jcmVhdGUtcGFnZS5jb21wb25lbnQuaHRtbCcgLFxyXG4gICAgY29udHJvbGxlcjogWydNYWlsYm94U2VydmljZScsICdMZXR0ZXJTZXJ2aWNlJywgJ1N0YXRlU2VydmljZScsICckc3RhdGUnLCAnJHEnLFxyXG4gICAgICAgIGZ1bmN0aW9uKE1haWxib3hTZXJ2aWNlLCBMZXR0ZXJTZXJ2aWNlLCBTdGF0ZVNlcnZpY2UsICRzdGF0ZSwgJHEpIHtcclxuICAgICAgICB2YXIgY3R4ID0gdGhpcztcclxuXHJcbiAgICAgICAgdGhpcy5jYW5jZWwgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIHByZXZpb3VzU3RhdGUgPSBTdGF0ZVNlcnZpY2UuZ2V0UHJldmlvdXNTdGF0ZSgpO1xyXG4gICAgICAgICAgICAkc3RhdGUuZ28ocHJldmlvdXNTdGF0ZS5zdGF0ZSwgcHJldmlvdXNTdGF0ZS5wYXJhbXMpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuc2F2ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzYXZlTWVzc2FnZVRvTWFpbGJveCgnZHJhZnQnLCB0aGlzLm1lc3NhZ2UpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuc2VuZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2F2ZU1lc3NhZ2VUb01haWxib3goJ291dGJveCcsIHRoaXMubWVzc2FnZSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICBmdW5jdGlvbiBzYXZlTWVzc2FnZVRvTWFpbGJveChtYWlsYm94VGl0bGUsIG1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgZ2V0TWFpbGJveEJ5VGl0bGUobWFpbGJveFRpdGxlKS50aGVuKGZ1bmN0aW9uKG1haWxib3gpIHtcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2UubWFpbGJveCA9IG1haWxib3guX2lkO1xyXG4gICAgICAgICAgICAgICAgTGV0dGVyU2VydmljZS5zYXZlKG1lc3NhZ2UsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwcmV2aW91c1N0YXRlID0gU3RhdGVTZXJ2aWNlLmdldFByZXZpb3VzU3RhdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28ocHJldmlvdXNTdGF0ZS5zdGF0ZSwgcHJldmlvdXNTdGF0ZS5wYXJhbXMpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBmdW5jdGlvbiBnZXRNYWlsYm94QnlUaXRsZSh0aXRsZSkge1xyXG4gICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgTWFpbGJveFNlcnZpY2UucXVlcnkoZnVuY3Rpb24obWFpbGJveGVzKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbWFpbGJveCA9IG1haWxib3hlcy5maWx0ZXIoZnVuY3Rpb24obWFpbGJveCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtYWlsYm94LnRpdGxlID09PSB0aXRsZTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUobWFpbGJveFswXSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfV1cclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdtYWlsLm1vZHVsZScpLmNvbXBvbmVudCgnbWFpbHNQYWdlJywgIHtcclxuICAgIHRlbXBsYXRlVXJsOiAnbWFpbC9tYWlscy1wYWdlL21haWxzLXBhZ2UuY29tcG9uZW50Lmh0bWwnXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnbWFpbC5tb2R1bGUnKS5mYWN0b3J5KCdMZXR0ZXJTZXJ2aWNlJywgWyckcmVzb3VyY2UnLCAnUkVTVF9VUkwnLCBmdW5jdGlvbiAoJHJlc291cmNlLCBSRVNUX1VSTCkge1xyXG4gICAgcmV0dXJuICRyZXNvdXJjZShSRVNUX1VSTCArICcvbGV0dGVycy86aWQnLHtcclxuICAgICAgICBpZDogJ0BfaWQnLFxyXG4gICAgfSk7XHJcbn1dKTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ21haWwubW9kdWxlJykuZmFjdG9yeSgnTWFpbGJveFNlcnZpY2UnLCBbJyRyZXNvdXJjZScsICdSRVNUX1VSTCcsIGZ1bmN0aW9uICgkcmVzb3VyY2UsIFJFU1RfVVJMKSB7XHJcbiAgICByZXR1cm4gJHJlc291cmNlKFJFU1RfVVJMICsgJy9tYWlsYm94ZXMvOmlkJyx7XHJcbiAgICAgICAgaWQ6ICdAX2lkJyxcclxuICAgIH0pO1xyXG59XSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdzaGFyZWQubW9kdWxlJykuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBbJyRxJywgZnVuY3Rpb24oJHEpIHtcclxuXHJcbiAgICAvLyBUT0RPIDogbWFrZSByZWFsIFJFU1QgcmVxdWVzdFxyXG5cclxuICAgIHZhciBhdXRoZW50aWNhdGVkVXNlcjtcclxuICAgIHZhciBpc0F1dGhlbnRpY2F0ZWQgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLmF1dGhlbnRpY2F0ZSA9IGZ1bmN0aW9uKGxvZ2luLCBwYXNzd29yZCkge1xyXG4gICAgICAgIGlmIChsb2dpbiA9PSAndGVzdCcgJiYgcGFzc3dvcmQgPT0gJ3Rlc3QnKSB7XHJcbiAgICAgICAgICAgIGlzQXV0aGVudGljYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZWRVc2VyID0gbG9naW47XHJcbiAgICAgICAgICAgIHJldHVybiAkcS5yZXNvbHZlKHRydWUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiAkcS5yZXNvbHZlKGZhbHNlKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIGlzQXV0aGVudGljYXRlZDtcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5nZXRBdXRoZW50aWNhdGVkVXNlciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBhdXRoZW50aWNhdGVkVXNlcjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGlzQXV0aGVudGljYXRlZCA9IGZhbHNlO1xyXG4gICAgICAgIGF1dGhlbnRpY2F0ZWRVc2VyID0gbnVsbDtcclxuICAgIH07XHJcblxyXG59XSk7IiwiYW5ndWxhci5tb2R1bGUoJ3NoYXJlZC5tb2R1bGUnKS5jb21wb25lbnQoJ2h0dHBBamF4TG9hZEluZGljYXRvcicsICB7XHJcbiAgICB0ZW1wbGF0ZVVybDogJ3NoYXJlZC9odHRwLWFqYXgtbG9hZC1pbmRpY2F0b3IvaHR0cC1hamF4LWxvYWQtaW5kaWNhdG9yLmNvbXBvbmVudC5odG1sJyxcclxuICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgZnVuY3Rpb24oJHNjb3BlKXtcclxuICAgICAgICB2YXIgY3R4ID0gdGhpcztcclxuICAgICAgICB0aGlzLnNob3dMb2FkSW5kaWNhdG9yID0gZmFsc2U7XHJcblxyXG4gICAgICAgICRzY29wZS4kb24oXCJsb2FkZXJfc2hvd1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGN0eC5zaG93TG9hZEluZGljYXRvciA9IHRydWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRzY29wZS4kb24oXCJsb2FkZXJfaGlkZVwiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGN0eC5zaG93TG9hZEluZGljYXRvciA9IGZhbHNlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfV1cclxufSk7XHJcblxyXG4iLCJhbmd1bGFyLm1vZHVsZSgnc2hhcmVkLm1vZHVsZScpLmZhY3RvcnkoJ0h0dHBSZXF1ZXN0TG9hZEluZGljYXRvckludGVyY2VwdG9yJywgWyckcScsICckcm9vdFNjb3BlJywgZnVuY3Rpb24oJHEsICRyb290U2NvcGUpIHtcclxuXHJcbiAgICB2YXIgbnVtTG9hZGluZ3MgPSAwO1xyXG5cclxuICAgIHZhciBodHRwUmVxdWVzdExvYWRJbmRpY2F0b3JJbnRlcmNlcHRvciA9IHtcclxuICAgICAgICByZXF1ZXN0OiBmdW5jdGlvbiAoY29uZmlnKSB7XHJcbiAgICAgICAgICAgIG51bUxvYWRpbmdzKys7XHJcblxyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoXCJsb2FkZXJfc2hvd1wiKTtcclxuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZyB8fCAkcS53aGVuKGNvbmZpZylcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICByZXNwb25zZTogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIGlmICgoLS1udW1Mb2FkaW5ncykgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChcImxvYWRlcl9oaWRlXCIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UgfHwgJHEud2hlbihyZXNwb25zZSk7XHJcblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIGlmICghKC0tbnVtTG9hZGluZ3MpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBIaWRlIGxvYWRlclxyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KFwibG9hZGVyX2hpZGVcIik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIGh0dHBSZXF1ZXN0TG9hZEluZGljYXRvckludGVyY2VwdG9yO1xyXG5cclxufV0pO1xyXG5cclxuXHJcbiIsImFuZ3VsYXIubW9kdWxlKCdzaGFyZWQubW9kdWxlJykuY29tcG9uZW50KCdodHRwU3RhdGljTG9hZEluZGljYXRvcicsICB7XHJcbiAgICB0ZW1wbGF0ZVVybDogJ3NoYXJlZC9odHRwLWFqYXgtbG9hZC1pbmRpY2F0b3IvaHR0cC1zdGF0aWMtbG9hZC1pbmRpY2F0b3IuY29tcG9uZW50Lmh0bWwnXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnc2hhcmVkLm1vZHVsZScpLmZhY3RvcnkoJ0h0dHBFcnJvckludGVyY2VwdG9yJywgWyckcScsIGZ1bmN0aW9uKCRxKSB7XHJcbiAgICB2YXIgaHR0cEVycm9ySW50ZXJjZXB0b3IgPSB7XHJcbiAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24ocmVqZWN0aW9uKSB7XHJcbiAgICAgICAgICAgIGlmIChyZWplY3Rpb24uc3RhdHVzID09IDQwMSB8fCByZWplY3Rpb24uc3RhdHVzID09IDQwNSkge1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyA6IGdvIHRvIGxvZ2luXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVqZWN0aW9uLnN0YXR1cyA9PSA0MDMpIHtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8gOiBnbyB0byBwcmV2aW91cyBzdGF0ZVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlamVjdGlvbi5zdGF0dXMgPT0gNDA0KSB7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPIDogZ28gdG8gaG9tZVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyA6IHNob3cgZXJyb3JcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZWplY3Rpb24pO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIGh0dHBFcnJvckludGVyY2VwdG9yO1xyXG59XSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdzaGFyZWQubW9kdWxlJykuc2VydmljZSgnU3RhdGVTZXJ2aWNlJywgZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgdmFyIGxvZ2luUmVkaXJlY3RTdGF0ZTtcclxuICAgIHZhciBwcmV2aW91c1N0YXRlO1xyXG5cclxuICAgIHRoaXMuc2V0TG9naW5SZWRpcmVjdFN0YXRlID0gZnVuY3Rpb24oc3RhdGUsIHBhcmFtcykge1xyXG4gICAgICAgIGxvZ2luUmVkaXJlY3RTdGF0ZSA9IHsgc3RhdGU6IHN0YXRlLCBwYXJhbXM6IHBhcmFtcyB9O1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmdldExvZ2luUmVkaXJlY3RTdGF0ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBsb2dpblJlZGlyZWN0U3RhdGU7XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuc2V0UHJldmlvdXNTdGF0ZSA9IGZ1bmN0aW9uKHN0YXRlLCBwYXJhbXMpIHtcclxuICAgICAgICBwcmV2aW91c1N0YXRlID0geyBzdGF0ZTogc3RhdGUsIHBhcmFtczogcGFyYW1zIH07XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuZ2V0UHJldmlvdXNTdGF0ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBwcmV2aW91c1N0YXRlO1xyXG4gICAgfTtcclxuXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgndXNlci5tb2R1bGUnKS5zZXJ2aWNlKCdVc2VyU2VydmljZScsIFsnJHEnLCAnUmVzdGFuZ3VsYXInLCBmdW5jdGlvbigkcSwgUmVzdGFuZ3VsYXIpIHtcclxuXHJcbiAgICB0aGlzLmdldEFsbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5hbGwoJ3VzZXJzJykuZ2V0TGlzdCgpO1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmdldE9uZSA9IGZ1bmN0aW9uKHVzZXJJZCkge1xyXG4gICAgICAgIHJldHVybiBSZXN0YW5ndWxhci5vbmUoJ3VzZXJzJywgdXNlcklkKS5nZXQoKTtcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbih1c2VyKSB7XHJcbiAgICAgICAgcmV0dXJuIHVzZXIucmVtb3ZlKCk7XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuc2F2ZSA9IGZ1bmN0aW9uKHVzZXIpIHtcclxuICAgICAgICBpZiAodXNlci5faWQpIHtcclxuICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHJcbiAgICAgICAgICAgIHVzZXIucmVtb3ZlKCkudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIFJlc3Rhbmd1bGFyLmFsbCgndXNlcnMnKS5wb3N0KHVzZXIpLnRoZW4oZnVuY3Rpb24odXNlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUodXNlcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gUmVzdGFuZ3VsYXIuYWxsKCd1c2VycycpLnBvc3QodXNlcik7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn1dKTsiLCJhbmd1bGFyLm1vZHVsZSgndXNlci5tb2R1bGUnKS5jb21wb25lbnQoJ3VzZXJzUGFnZScsICB7XHJcbiAgICB0ZW1wbGF0ZVVybDogJ3VzZXIvdXNlcnMtcGFnZS91c2Vycy1wYWdlLmNvbXBvbmVudC5odG1sJ1xyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ21haWwubW9kdWxlJykuY29tcG9uZW50KCdtYWlsRGV0YWlsZWQnLCB7XHJcbiAgICAgICAgYmluZGluZ3M6IHtcclxuICAgICAgICAgICAgbGV0dGVySWQ6ICc8JyxcclxuICAgICAgICAgICAgbWFpbGJveElkOiAnPCdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnbWFpbC9tYWlscy1wYWdlL21haWwtZGV0YWlsZWQvbWFpbC1kZXRhaWxlZC5jb21wb25lbnQuaHRtbCcgLFxyXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnTGV0dGVyU2VydmljZScsICckc3RhdGUnLCBmdW5jdGlvbihMZXR0ZXJTZXJ2aWNlLCAkc3RhdGUpIHtcclxuICAgICAgICAgICAgdmFyIGN0eCA9IHRoaXM7XHJcbiAgICAgICAgICAgIExldHRlclNlcnZpY2UuZ2V0KHsgaWQgOiB0aGlzLmxldHRlcklkfSwgZnVuY3Rpb24obGV0dGVyKSB7XHJcbiAgICAgICAgICAgICAgICBjdHgubGV0dGVyID0gbGV0dGVyO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ29CYWNrID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ21haWxib3hlcy5tYWlsLXRhYmxlJywgeyBtYWlsYm94SWQ6IGN0eC5tYWlsYm94SWQgfSk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgY3R4LmxldHRlci4kZGVsZXRlKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbWFpbGJveGVzLm1haWwtdGFibGUnLCB7IG1haWxib3hJZDogY3R4Lm1haWxib3hJZCB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1dXHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnbWFpbC5tb2R1bGUnKS5jb21wb25lbnQoJ21haWxUYWJsZScsIHtcclxuICAgICAgICBiaW5kaW5nczoge1xyXG4gICAgICAgICAgICBtYWlsYm94SWQ6ICc8JyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnbWFpbC9tYWlscy1wYWdlL21haWwtdGFibGUvbWFpbC10YWJsZS5jb21wb25lbnQuaHRtbCcsXHJcbiAgICAgICAgY29udHJvbGxlcjogWydMZXR0ZXJTZXJ2aWNlJywgZnVuY3Rpb24oTGV0dGVyU2VydmljZSl7XHJcbiAgICAgICAgICAgIHZhciBjdHggPSB0aGlzO1xyXG4gICAgICAgICAgICBMZXR0ZXJTZXJ2aWNlLnF1ZXJ5KGZ1bmN0aW9uKGxldHRlcnMpIHtcclxuICAgICAgICAgICAgICAgIGN0eC5sZXR0ZXJzID0gbGV0dGVycy5maWx0ZXIoZnVuY3Rpb24obGV0dGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxldHRlci5tYWlsYm94ID09PSBjdHgubWFpbGJveElkO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1dXHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnbWFpbC5tb2R1bGUnKS5jb21wb25lbnQoJ21haWxib3hMaXN0JywgIHtcclxuICAgIHRlbXBsYXRlVXJsOiAnbWFpbC9tYWlscy1wYWdlL21haWxib3gtbGlzdC9tYWlsYm94LWxpc3QuY29tcG9uZW50Lmh0bWwnLFxyXG4gICAgY29udHJvbGxlcjogWydNYWlsYm94U2VydmljZScsICckc3RhdGUnLCBmdW5jdGlvbihNYWlsYm94U2VydmljZSwgJHN0YXRlKXtcclxuICAgICAgICB2YXIgY3R4ID0gdGhpcztcclxuICAgICAgICBNYWlsYm94U2VydmljZS5xdWVyeShmdW5jdGlvbihtYWlsYm94ZXMpIHtcclxuICAgICAgICAgICAgY3R4Lm1haWxib3hlcyA9IG1haWxib3hlcztcclxuICAgICAgICAgICAgaWYgKG1haWxib3hlcyAmJiBtYWlsYm94ZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdtYWlsYm94ZXMubWFpbC10YWJsZScsIHsgbWFpbGJveElkOiBtYWlsYm94ZXNbMF0uX2lkIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XVxyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ3VzZXIubW9kdWxlJykuY29tcG9uZW50KCd1c2VySXRlbURldGFpbGVkJywgIHtcclxuICAgIGJpbmRpbmdzOiB7XHJcbiAgICAgICAgdXNlcklkOiBcIjxcIlxyXG4gICAgfSxcclxuICAgIHRlbXBsYXRlVXJsOiAndXNlci91c2Vycy1wYWdlL3VzZXItaXRlbS1kZXRhaWxlZC91c2VyLWl0ZW0tZGV0YWlsZWQuY29tcG9uZW50Lmh0bWwnLFxyXG4gICAgY29udHJvbGxlcjogWydVc2VyU2VydmljZScsICckc3RhdGUnLCBmdW5jdGlvbihVc2VyU2VydmljZSwgJHN0YXRlKXtcclxuICAgICAgICB2YXIgY3R4ID0gdGhpcztcclxuXHJcbiAgICAgICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgVXNlclNlcnZpY2UuZGVsZXRlKHRoaXMudXNlcikudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygndXNlcnMnLCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBVc2VyU2VydmljZS5nZXRPbmUodGhpcy51c2VySWQpLnRoZW4oZnVuY3Rpb24odXNlcikge1xyXG4gICAgICAgICAgICBjdHgudXNlciA9IHVzZXI7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XVxyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ3VzZXIubW9kdWxlJykuY29tcG9uZW50KCd1c2VySXRlbUVkaXQnLCAge1xyXG4gICAgYmluZGluZ3M6IHtcclxuICAgICAgICB1c2VySWQ6IFwiPFwiXHJcbiAgICB9LFxyXG4gICAgdGVtcGxhdGVVcmw6ICd1c2VyL3VzZXJzLXBhZ2UvdXNlci1pdGVtLWVkaXQvdXNlci1pdGVtLWVkaXQuY29tcG9uZW50Lmh0bWwnLFxyXG4gICAgY29udHJvbGxlcjogWydVc2VyU2VydmljZScsICckc3RhdGUnLCBmdW5jdGlvbihVc2VyU2VydmljZSwgJHN0YXRlKXtcclxuICAgICAgICB2YXIgY3R4ID0gdGhpcztcclxuXHJcbiAgICAgICAgdGhpcy5jYW5jZWwgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudXNlcklkKSB7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ3VzZXJzLnVzZXItZGV0YWlsZWQnLCB7dXNlcklkOiB0aGlzLnVzZXJJZH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCd1c2VycycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgVXNlclNlcnZpY2UuZGVsZXRlKHRoaXMudXNlcikudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygndXNlcnMnLCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLnNhdmUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgVXNlclNlcnZpY2Uuc2F2ZSh0aGlzLnVzZXIpLnRoZW4oZnVuY3Rpb24odXNlcikge1xyXG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCd1c2Vycy51c2VyLWRldGFpbGVkJywge3VzZXJJZDogdXNlci5faWQgfSwge3JlbG9hZDogdHJ1ZX0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZiAodGhpcy51c2VySWQpIHtcclxuICAgICAgICAgICAgVXNlclNlcnZpY2UuZ2V0T25lKHRoaXMudXNlcklkKS50aGVuKGZ1bmN0aW9uKHVzZXIpIHtcclxuICAgICAgICAgICAgICAgIGN0eC51c2VyID0gdXNlcjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfV1cclxufSk7XHJcblxyXG4iLCJhbmd1bGFyLm1vZHVsZSgndXNlci5tb2R1bGUnKS5jb21wb25lbnQoJ3VzZXJMaXN0JywgIHtcclxuICAgIHRlbXBsYXRlVXJsOiAndXNlci91c2Vycy1wYWdlL3VzZXItbGlzdC91c2VyLWxpc3QuY29tcG9uZW50Lmh0bWwnLFxyXG4gICAgY29udHJvbGxlcjogWydSZXN0YW5ndWxhcicsIGZ1bmN0aW9uKFJlc3Rhbmd1bGFyKXtcclxuICAgICAgICB2YXIgY3R4ID0gdGhpcztcclxuICAgICAgICBSZXN0YW5ndWxhci5hbGwoJ3VzZXJzJykuZ2V0TGlzdCgpLnRoZW4oZnVuY3Rpb24odXNlcnMpIHtcclxuICAgICAgICAgICAgY3R4LnVzZXJzID0gdXNlcnM7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XVxyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ21haWxBcHAnLCBbJ3NoYXJlZC5tb2R1bGUnLCAnbWFpbi5tb2R1bGUnLCAnaG9tZS5tb2R1bGUnLCAnbG9naW4ubW9kdWxlJywgJ3VzZXIubW9kdWxlJywgJ21haWwubW9kdWxlJywgJ3VpLnJvdXRlciddKTtcclxuXHJcbmFuZ3VsYXIubW9kdWxlKCdtYWlsQXBwJykuY29uZmlnKFsnJHVybFJvdXRlclByb3ZpZGVyJywgZnVuY3Rpb24oJHVybFJvdXRlclByb3ZpZGVyKSB7XHJcbiAgICAkdXJsUm91dGVyUHJvdmlkZXJcclxuICAgICAgICAub3RoZXJ3aXNlKCcvaG9tZScpO1xyXG59XSk7Il19
