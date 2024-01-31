import Phaser from 'phaser';

const GAME_SPEED_DEFAULT = 10;
const VOLUME_VOL = 0.2;
const INITIAL_SCORE = '00000';
const TEXT_SIZE = '35px';
const DINO_WIDTH = 44;
const DINO_HEIGHT = 92;
const HIGHT_SCORE = 200;
const LIGHT_BG = '#1212123b';
const DARK_BG = '#141414';

class PlayScene extends Phaser.Scene {
  constructor() {
    super('PlayScene');
  }

  create() {
    // 初始化遊戲場景
    const { height, width } = this.game.config;
    this.gameSpeed = GAME_SPEED_DEFAULT;
    this.isGameRunning = false;
    this.respawnTime = 0;
    this.score = 0;
    this.mode = 'light';
    // 載入音效
    this.jumpSound = this.sound.add('jump', { volume: VOLUME_VOL });
    this.hitSound = this.sound.add('hit', { volume: VOLUME_VOL });
    this.reachSound = this.sound.add('reach', { volume: VOLUME_VOL });

    // 創建元素
    this.startTrigger = this.physics.add
      .sprite(0, 10)
      .setOrigin(0, 1)
      .setImmovable();
    this.ground = this.add
      .tileSprite(0, height, 88, 26, 'ground')
      .setOrigin(0, 1);
    this.dino = this.physics.add
      .sprite(0, height, 'dino-idle')
      .setCollideWorldBounds(true)
      .setGravityY(5000)
      .setBodySize(DINO_WIDTH, DINO_HEIGHT)
      .setDepth(1)
      .setOrigin(0, 1);

    this.scoreText = this.add
      .text(width, 0, INITIAL_SCORE, {
        fill: '#535353',
        font: `900 ${TEXT_SIZE} Courier`,
        resolution: 5,
      })
      .setOrigin(1, 0)
      .setAlpha(0);

    this.highScoreText = this.add
      .text(0, 0, INITIAL_SCORE, {
        fill: '#535353',
        font: `900 ${TEXT_SIZE} Courier`,
        resolution: 5,
      })
      .setOrigin(1, 0)
      .setAlpha(0);
    this.initAnims();

    // set lightEnv
    this.lightEnv = this.add.group();
    this.cloud1 = this.add.image(width / 2, 170, 'cloud');
    this.cloud2 = this.add.image(width - 80, 80, 'cloud');
    this.cloud3 = this.add.image(width / 1.3, 100, 'cloud');
    this.lightEnv.addMultiple([this.cloud1, this.cloud2, this.cloud3]);
    this.lightEnv.setAlpha(0);

    // set darkEnv
    this.darkEnv = this.add.group();
    const starPos = [120, 80, 100, 90, 150];
    for (var i = 0; i < 8; i++) {
      var star = this.darkEnv.create(
        (Math.random() + 1) * (i * 100),
        starPos[Math.floor(Math.random() * 5)],
        'star'
      );
      star.setDisplaySize(9, 9);
      star.play('star-shine');
    }
    this.darkEnv.setAlpha(0);

    this.gameOverScreen = this.add
      .container(width / 2, height / 2 - 50)
      .setAlpha(0);
    this.gameOverText = this.add.image(0, 0, 'game-over');
    this.restart = this.add.image(0, 80, 'restart').setInteractive();
    this.gameOverScreen.add([this.gameOverText, this.restart]);

    this.obstacles = this.physics.add.group();
    this.button = this.add.image(20, 20, 'mode').setInteractive().setScale(0.5);
    this.button.on('pointerdown', this.toggleDayNight, this);

    // 初始化動畫、碰撞、輸入事件等
    this.initStartTrigger();
    this.initColliders();
    this.handleInputs();
    this.handleScore();
  }

  initColliders() {
    // 設置碰撞檢測
    this.physics.add.collider(
      this.dino,
      this.obstacles,
      () => {
        // 處理碰撞
        const textGap = 20;
        this.highScoreText.x =
          this.scoreText.x - this.scoreText.width - textGap;

        const highScore = this.highScoreText.text.substr(
          this.highScoreText.text.length - 5
        );

        const newScore =
          Number(this.scoreText.text) > Number(highScore)
            ? this.scoreText.text
            : highScore;

        this.highScoreText.setText('High ' + newScore);
        this.highScoreText.setAlpha(1);

        // 碰撞後結束執行
        this.physics.pause();
        this.isGameRunning = false;
        this.anims.pauseAll();
        this.dino.setTexture('dino-hurt');
        this.respawnTime = 0;
        this.gameSpeed = GAME_SPEED_DEFAULT;
        this.gameOverScreen.setAlpha(1);
        this.score = 0;
        this.hitSound.play();
      },
      null,
      this
    );
  }

  initStartTrigger() {
    // 初始化遊戲開始的觸發點
    const { width, height } = this.game.config;
    this.physics.add.overlap(
      this.startTrigger,
      this.dino,
      () => {
        if (this.startTrigger.y === 10) {
          this.startTrigger.body.reset(0, height);
          return;
        }

        this.startTrigger.disableBody(true, true);
        // 開始遊戲
        const startEvent = this.time.addEvent({
          delay: 1000 / 60,
          loop: true,
          callbackScope: this,
          callback: () => {
            this.dino.setVelocityX(80);
            this.dino.play('dino-run', 1);

            if (this.ground.width < width) this.ground.width += 17 * 2;

            if (this.ground.width >= 1000) {
              this.ground.width = width;
              this.isGameRunning = true;
              this.dino.setVelocityX(0);
              this.scoreText.setAlpha(1);
              this.toggleDayNight();
              startEvent.remove();
            }
          },
        });
      },
      null,
      this
    );
  }

  initAnims() {
    // 初始化動畫
    this.anims.create({
      key: 'dino-run',
      frames: this.anims.generateFrameNumbers('dino', { start: 2, end: 3 }),
      frameRate: 10,
      repeat: -1, // -1 代表會重複
    });

    this.anims.create({
      key: 'dino-down-anim',
      frames: this.anims.generateFrameNumbers('dino-down', {
        start: 0,
        end: 1,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'enemy-dino-fly',
      frames: this.anims.generateFrameNumbers('enemy-bird', {
        start: 0,
        end: 1,
      }),
      frameRate: 6,
      repeat: -1,
    });

    this.anims.create({
      key: 'star-shine',
      frames: this.anims.generateFrameNumbers('star', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
  }

  handleScore() {
    // 處理分數的計算和顯示

    this.time.addEvent({
      delay: 1000 / 10,
      loop: true,
      callbackScope: this,
      callback: () => {
        if (!this.isGameRunning) {
          return;
        }

        this.score++;
        this.gameSpeed += 0.01;

        if (this.score % 100 === 0) {
          this.reachSound.play();

          // https://photonstorm.github.io/phaser3-docs/Phaser.Tweens.Tween.html
          this.tweens.add({
            targets: this.scoreText,
            duration: 100,
            repeat: 3,
            alpha: 0,
            yoyo: true,
          });
        }

        // 顯示分數
        const score = Array.from(String(this.score), Number);
        for (let i = 0; i < 5 - String(this.score).length; i++) {
          score.unshift(0);
        }

        this.scoreText.setText(score.join(''));
      },
    });
  }

  handleInputs() {
    // 按鍵控制
    this.restart.on('pointerdown', () => {
      this.dino.setVelocityY(0);
      this.dino.body.height = 92;
      this.dino.body.offset.y = 0;
      this.physics.resume();
      this.obstacles.clear(true, true);
      this.isGameRunning = true;
      this.gameOverScreen.setAlpha(0);
      this.anims.resumeAll();
    });

    // 空白鍵-跳躍
    this.input.keyboard.on('keydown_SPACE', () => {
      if (!this.dino.body.onFloor() || this.dino.body.velocity.x > 0) {
        return;
      }

      this.jumpSound.play();
      this.dino.body.height = 92;
      this.dino.body.offset.y = 0;
      this.dino.setVelocityY(-1600);
      this.dino.setTexture('dino', 0);
    });

    // 下方鍵-躺下
    this.input.keyboard.on('keydown_DOWN', () => {
      if (!this.dino.body.onFloor() || !this.isGameRunning) {
        return;
      }

      this.dino.body.height = 58;
      this.dino.body.offset.y = 34;
    });

    // 釋放下方鍵
    this.input.keyboard.on('keyup_DOWN', () => {
      if (this.score !== 0 && !this.isGameRunning) {
        return;
      }

      this.dino.body.height = 92;
      this.dino.body.offset.y = 0;
    });
  }

  handelObstacle() {
    // 放置障礙物
    let randomType = 6; // Default
    if (this.score > HIGHT_SCORE) randomType = 7;
    const obstacleNum = Math.floor(Math.random() * randomType) + 1;
    const distance = Phaser.Math.Between(600, 900);

    let obstacle;
    if (obstacleNum > 6) {
      const enemyHeight = [20, 50];
      obstacle = this.obstacles
        .create(
          this.game.config.width + distance,
          this.game.config.height - enemyHeight[Math.floor(Math.random() * 2)],
          `enemy-bird`
        )
        .setOrigin(0, 1);
      obstacle.play('enemy-dino-fly', 1);
      obstacle.body.height = obstacle.body.height / 1.5;
    } else {
      obstacle = this.obstacles
        .create(
          this.game.config.width + distance,
          this.game.config.height,
          `obstacle-${obstacleNum}`
        )
        .setOrigin(0, 1);

      obstacle.body.offset.y = +10;
    }

    obstacle.setImmovable();
  }

  // 60 fps
  update(time, delta) {
    // 如果沒開始就不動
    if (!this.isGameRunning) return;

    // 地面、障礙物、環境的移動
    this.ground.tilePositionX += this.gameSpeed;
    Phaser.Actions.IncX(this.obstacles.getChildren(), -this.gameSpeed);
    Phaser.Actions.IncX(this.lightEnv.getChildren(), -0.5);
    Phaser.Actions.IncX(this.darkEnv.getChildren(), -0.5);
    // 控制障礙物的生成
    this.respawnTime += delta * this.gameSpeed * 0.08;
    if (this.respawnTime >= 1500) {
      this.handelObstacle();
      this.respawnTime = 0;
    }

    // 移除超出螢幕的障礙物
    this.obstacles.getChildren().forEach((obstacle) => {
      if (obstacle.getBounds().right < 0) {
        this.obstacles.killAndHide(obstacle);
      }
    });
    // 移除超出螢幕的環境元素
    this.lightEnv.getChildren().forEach((env) => {
      if (env.getBounds().right < 0) {
        env.x = this.game.config.width + 30;
      }
    });

    this.darkEnv.getChildren().forEach((env) => {
      if (env.getBounds().right < 0) {
        env.x = this.game.config.width + 30;
      }
    });

    // 控制恐龍動畫
    if (this.dino.body.deltaAbsY() > 0) {
      this.dino.anims.stop();
      this.dino.setTexture('dino', 0);
    } else {
      this.dino.body.height <= 58
        ? this.dino.play('dino-down-anim', true)
        : this.dino.play('dino-run', true);
    }
  }

  toggleDayNight() {
    var currentMode = this.mode;
    this.mode = currentMode === 'light' ? 'dark' : 'light';

    if (this.ground.width < 1000) {
      document.body.style.background =
        this.mode === 'light' ? LIGHT_BG : DARK_BG;
      return;
    }

    if (currentMode === 'light') {
      this.lightEnv.setAlpha(1);
      this.darkEnv.setAlpha(0);
      document.body.style.background = LIGHT_BG;
    } else {
      this.lightEnv.setAlpha(0);
      this.darkEnv.setAlpha(1);
      document.body.style.background = DARK_BG;
    }
  }
}

export default PlayScene;
