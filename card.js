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
        drawCardSet(this.controlCards, 175);
        
        this.ctx.fillRect(0, height / 2 - 1, width, 2);
    }
};

Sim2.prototype.refresh = function(){
    var cardValue = parseInt($('#input2_cardVal').val());
    var manaValue = parseInt($('#input2_manaVal').val());

    this.makeCards(cardValue, manaValue);
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
