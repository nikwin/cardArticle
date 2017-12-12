var width = 480;
var height = 320;

var makeCard = function(manaCost, cardValue, manaValue){
    var value = cardValue + manaValue * manaCost;
    return {
        manaCost: manaCost,
        attack: value, 
        health: value
    };
};

var drawCard = function(ctx, rect, card){
    ctx.strokeRect(rect[0], rect[1], rect[2], rect[3]);
    ctx.fillText(card.manaCost, rect[0] + 12, rect[1] + 20);
    ctx.fillText(card.attack + '/' + card.health, rect[0] + rect[2] / 2 - 10, rect[1] + rect[3] - 15);
};

var Sim1 = function(){
    this.canvas = $('#sim1')[0];
    this.ctx = this.canvas.getContext('2d');
    $('#input1_cardVal').on('change', () => this.refresh());
    $('#input1_manaVal').on('change', () => this.refresh());
};

Sim1.prototype.update = function(interval){
    return true;
};

Sim1.prototype.draw = function(){
    this.ctx.fillStyle = '#aaaacc';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.strokeStyle = '#000000';
    this.ctx.fillStyle = '#000000';
    this.ctx.textAlign = 'center';
    this.ctx.font = '20px Arial';

    _.each(this.cards, (card, i) => {
        var row = Math.floor(i / 5);
        var column = i % 5;
        var rect = [4 + column * 95, 10 + row * 160, 90, 140];
        drawCard(this.ctx, rect, card);
    });
};

Sim1.prototype.initialize = function(){
    this.refresh();
};

Sim1.prototype.refresh = function(){
    var cardValue = parseInt($('#input1_cardVal').val());
    var manaValue = parseInt($('#input1_manaVal').val());
    
    this.makeCards(cardValue, manaValue);
};

Sim1.prototype.makeCards = function(cardValue, manaValue){
    this.cards = _.map(_.range(1, 11), i => makeCard(i, cardValue, manaValue));
};

var Player = function(deck, health){
    this.health = health;
    this.deck = _.map(deck, card => _.clone(card));
    this.hand = [];
    this.board = [];
    this.mana = 0;

    this.draw(4);
};

Player.prototype.draw = function(n){
    for (var i = 0; i < n; i++){
        if (this.deck.length > 0){
            var idx = Math.floor(Math.random() * this.deck.length);
            this.hand.push(this.deck[idx]);
            this.deck.splice(idx, 1);
        }
        else{
            this.health -= 10000;
        }
    }
};

Player.prototype.takeTurn = function(opp){
    this.mana += 1;
    this.mana = min(this.mana, 10);
    
    this.draw(1);
    
    this.attack(opp);

    this.playCards();
};

Player.prototype.attack = function(opp){
    if (opp.health < this.health){
        _.each(this.board, card => opp.health -= card.attack);
    }
    else{
        var bestAttackPattern = this.findBestAttack(opp);
        
        for (var i = 0; i < bestAttackPattern.length; i++){
            var card = this.board[i];
            var target = bestAttackPattern[i];
            if (target == -1){
                opp.health -= card.attack;
            }
            else{
                var oppCard = opp.board[target];
                oppCard.health -= card.attack;
                card.health -= oppCard.attack;
            }
        }
    }
};

Player.prototype.findBestAttack = function(opp){
    var bestPattern = [];
    var bestValue = 0;

    var pattern = _.map(this.board, () => -1);
    while (pattern[0] < opp.board.length){
        var legalAttack = true;
        
        var healths = [opp.health].concat(_.map(opp.board, card => card.health));
        var damageBack = [0].concat(_.map(opp.board, card => card.attack));

        var score = 0;
        for (var i = 0; i < pattern.length; i++){
            var target = pattern[i] + 1;
            if (target > 0 && healths[target] <= 0){
                legalAttack = false;
                break;
            }
            healths[target] -= this.board[i].attack;
            if (healths[target] <= 0){
                if (target === 0){
                    return pattern;
                }
                else{
                    score += target.attack * 100;
                }
            }
            
            if (damageBack[target] > this.board[i].health){
                score -= 50 * this.board[i].attack;
            }

            if (target === 0){
                score += this.board[i].attack;
            }
        }

        if (score > bestValue){
            bestPattern = _.clone(pattern);
            bestValue = score;
        }

        var inc = pattern.length - 1;
        pattern[inc] += 1;
        while (pattern[inc] == opp.board.length){
            if (inc >= 1){
                pattern[inc] = 0;
                inc -= 1;
                pattern[inc] += 1;
            }
            else{
                break;
            }
        }
    }

    return bestPattern;
};

Player.prototype.playCards = function(){
    var playableCards = _.filter(this.hand, card => card.manaCost < this.mana);
    
    var bestSet = [];
    var bestValue = 0;

    var cardCheck = function(playedCards){
        var score = _.reduce(playedCards, (memo, card) => memo + card.attack + card.health, 0);
        if (score > bestValue){
            bestSet = playedCards;
            bestValue = score;
        }
    };

    //can sort these cards by mana cost to avoid duplicate searches.

    var mana = this.mana;

    var findCards = function(playedCards, playableCards, manaPlayed){
        if (manaPlayed == mana){
            cardCheck(playedCards);
        }
        else{
            playableCards = _.filter(playableCards, card => card.manaCost < mana - manaPlayed);
            if (playableCards.length == 0){
                cardCheck(playedCards);
            }
            else{
                for (var i = 0; i < playableCards.length; i++){
                    var card = playableCards[i];
                    var newPlayedCards = _.clone(playedCards);
                    newPlayedCards.push(card);
                    var newPlayableCards = _.clone(playableCards);
                    newPlayableCards.splice(i, 1);
                    findCards(newPlayedCards, newPlayableCards, manaPlayed + card.manaCost);
                }
            }
        }
    };

    findCards([], this.hand, 0);

    this.hand = _.difference(this.hand, bestSet);
    this.board = this.board.concat(bestSet);
};

Player.prototype.death = function(){
    this.board = _.filter(this.board, card => card.health > 0);
};

var Game = function(decks, startHealth){
    this.players = _.map(decks, deck => new Player(deck, startHealth));
    this.activeIndex = Math.floor(Math.random() * this.players.length);
};

Game.prototype.takeTurn = function(){
    var activePlayer = this.players[this.activeIndex];
    var oppPlayer = _.without(this.players, activePlayer)[0];
    activePlayer.takeTurn(oppPlayer);

    this.activeIndex += 1;
    this.activeIndex %= this.players.length;

    _.invoke(this.players, 'death');

    return _.any(this.players, player => player.health <= 0);
};

var Sim2 = function(){
    this.canvas = $('#sim2')[0];
    this.ctx = this.canvas.getContext('2d');
    $('#input2_cardVal').on('change', () => this.refresh());
    $('#input2_manaVal').on('change', () => this.refresh());
};

Sim2.prototype.update = function(interval){
    return true;
};

Sim2.prototype.draw = function(){
    this.ctx.fillStyle = '#aaaacc';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.strokeStyle = '#000000';
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '20px Arial';

    if (this.mode == 'high'){
        var drawCardSet = (cardSet, y) => {
            var sortedCards = _.groupBy(cardSet, 'manaCost');
            var column = 0;
            _.each(sortedCards, (cards, i) => {
                var rect = [4 + column * 95, y, 90, 125];
                drawCard(this.ctx, rect, cards[0]);
                this.ctx.fillText('x' + cards.length, rect[0] + 30, rect[1] + rect[3] + 20);
                column += 1;
            });
        };

        drawCardSet(this.aggroCards, 10);
        this.ctx.fillText('Aggro', 400, 40);
        this.ctx.fillText('' + this.aggroWinPercent + '%', 400, 100);

        drawCardSet(this.controlCards, 175);
        this.ctx.fillText('Control', 400, 200);
        this.ctx.fillText('' + (100 - this.aggroWinPercent) + '%', 400, 260);
        
        this.ctx.fillRect(0, height / 2 - 1, width, 2);
    }
};

Sim2.prototype.refresh = function(){
    var cardValue = parseInt($('#input2_cardVal').val());
    var manaValue = parseInt($('#input2_manaVal').val());

    this.makeCards(cardValue, manaValue);

    var aggroWins = 0;
    var controlWins = 0;

    for (var i = 0; i < 10; i++){
        var game = new Game([this.aggroCards, this.controlCards], 50);
        while (!game.takeTurn()){}
        
        if (game.players[0].health > 0){
            aggroWins += 1;
        }
        else{
            controlWins += 1;
        }
    }
        
    this.aggroWinPercent = Math.floor(100 * aggroWins / (aggroWins + controlWins));
};

Sim2.prototype.initialize = function(){
    this.mode = 'high';
    this.refresh();
};

Sim2.prototype.makeCards = function(cardValue, manaValue){
    var cardsFromCosts = function(costs){
        var cards = [];

        _.each(costs, (pair) => {
            _.each(_.range(pair[1]), () => cards.push(makeCard(pair[0], cardValue, manaValue)));
        });

        return cards;
    };

    this.aggroCards = cardsFromCosts([[1, 4], [2, 8], [3, 4], [4, 4]]);
    this.controlCards = cardsFromCosts([[2, 4], [3, 4], [4, 8], [5, 4]]);
};

var App = function(){
    this.sims = [
        new Sim1(),
        new Sim2()
    ];
    _.each(this.sims, sim => sim.initialize());
};

App.prototype.update = function(interval){
    this.sims = _.filter(this.sims, sim => sim.update(interval));
    return true;
};

App.prototype.draw = function(){
    _.each(this.sims, sim => sim.draw());
};

var getFrameFunctions = function(){
    var app = new App();
    return {
        update: function(){
            var interval = timeFeed.getInterval();
            return app.update(interval);
        },
        draw: function(){
            app.draw();
        }
    };
};

var initialize = function(){
    $('input[type=range]').on('change', function(){
        var val = $(this).val();
        var id = $(this).attr('id');
        id = '#' + id.replace('input', 'disp');
        $(id).text(val);
    });
};

var main = function(){
    initialize();
    var functions = getFrameFunctions();
    var tickFun = function(){
        var cont = functions.update();
        functions.draw();
        if (cont){
            requestAnimFrame(tickFun);
        }
    };
    tickFun();
};

window.onload = main;
