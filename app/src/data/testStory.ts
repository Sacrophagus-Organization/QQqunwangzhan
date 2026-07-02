/**
 * 内置测试剧本 —— 明日方舟·孤星片段
 * 从 juqing.html 转换为 StoryPlayData 格式
 */
import type { StoryPlayData } from '@/types';

const TEST_STORY: StoryPlayData = {
  story: {
    id: '__test__',
    title: '孤星·序章',
    description: '凯尔希与普瑞赛斯的对峙——明日方舟孤星活动片段',
    author: '系统',
    authorId: 'system',
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  characters: [
    { id: 'ch-1', storyId: '__test__', name: 'Mon3tr', nameTagColor: '#c9a96e', sprites: {} },
    { id: 'ch-2', storyId: '__test__', name: '凯尔希', nameTagColor: '#c9a96e', sprites: {} },
    { id: 'ch-3', storyId: '__test__', name: '普瑞赛斯', nameTagColor: '#c9a96e', sprites: {} },
  ],
  scenes: [
    {
      id: 'sc-1',
      storyId: '__test__',
      name: '唤醒室',
      background: '',
      order: 0,
      transition: 'none',
    },
  ],
  lines: [
    {
      id: 'ln-1', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'left', characterName: 'Mon3tr',
      text: '（兴奋的咆哮）',
      leftImage: 'char2.png', rightImage: undefined, order: 0,
    },
    {
      id: 'ln-2', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'right', characterName: '普瑞赛斯',
      text: '......',
      leftImage: 'char2.png', rightImage: 'char3.png', order: 1,
    },
    {
      id: 'ln-3', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'narrator', characterName: '',
      text: 'Mon3tr出现在你的身前，它的姿态却稍不同于往常。\n不用凯尔希的命令，它以迅猛的速度向敌人飞去，可一簇源石结晶拔地而起，将黑色的怪物完全包裹其中。',
      leftImage: 'char2.png', rightImage: 'char3.png', order: 2,
    },
    {
      id: 'ln-4', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'narrator', characterName: '',
      text: '【凯尔希！当心——】',
      leftImage: 'char2.png', rightImage: 'char3.png', order: 3,
    },
    {
      id: 'ln-5', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'right', characterName: '普瑞赛斯',
      text: '你很让我惊喜，AMa-10。',
      leftImage: 'char2.png', rightImage: 'char3.png', order: 4,
    },
    {
      id: 'ln-6', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'right', characterName: '普瑞赛斯',
      text: '你以切断自己双生循环的系统为代价来脱离我的控制，哪怕这样会使你的生命变得脆弱不堪。',
      leftImage: 'char2.png', rightImage: 'char3.png', order: 5,
    },
    {
      id: 'ln-7', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'right', characterName: '普瑞赛斯',
      text: '不过，你真的打算用这样的方式杀了我吗？',
      leftImage: 'char2.png', rightImage: 'char3.png', order: 6,
    },
    {
      id: 'ln-8', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'left', characterName: '凯尔希',
      text: '我知道，在很久之前，你的意识已经与源石中的信息海洋同化。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 7,
    },
    {
      id: 'ln-9', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'left', characterName: '凯尔希',
      text: '在这种情况下，真正杀死你已经是不可能的事。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 8,
    },
    {
      id: 'ln-10', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'left', characterName: '凯尔希',
      text: '但是特蕾西娅和特雷西斯做到的事，让我确信了一点。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 9,
    },
    {
      id: 'ln-11', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'left', characterName: '凯尔希',
      text: '你对源石的控制并非无可动摇，依然存在一些手段来限制你对于源石的权限。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 10,
    },
    {
      id: 'ln-12', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'right', characterName: '普瑞赛斯',
      text: '你所说的两个人，我的确在源石内部见过他们。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 11,
    },
    {
      id: 'ln-13', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'right', characterName: '普瑞赛斯',
      text: '他们的努力的确出人意料，是令人惊喜的挣扎。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 12,
    },
    {
      id: 'ln-14', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'right', characterName: '普瑞赛斯',
      text: '所以呢？你又如何确信，在这里杀了我不是徒劳之举？',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 13,
    },
    {
      id: 'ln-15', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'left', characterName: '凯尔希',
      text: 'Mon3tr攻击你的时候，你选择了防御。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 14,
    },
    {
      id: 'ln-16', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'right', characterName: '普瑞赛斯',
      text: '......',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 15,
    },
    {
      id: 'ln-17', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'right', characterName: '普瑞赛斯',
      text: '......你怎么能做到？',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 16,
    },
    {
      id: 'ln-18', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'left', characterName: '凯尔希',
      text: '看来你已经察觉到了。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 17,
    },
    {
      id: 'ln-19', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'left', characterName: '凯尔希',
      text: '基于特蕾西娅对源石的研究，同样是模仿你对Dr.博士设下的陷阱，我对你所处的唤醒室加入了一些设计。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 18,
    },
    {
      id: 'ln-20', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'left', characterName: '凯尔希',
      text: '只要你在这里醒来，你的意识，同样会困于这具身体，而无法重新回到源石内部的信息海洋。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 19,
    },
    {
      id: 'ln-21', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'right', characterName: '普瑞赛斯',
      text: '......？',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 20,
    },
    {
      id: 'ln-22', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'left', characterName: '凯尔希',
      text: '或许你迟早能突破这一层限制，而且你依然有操作源石的权限，但此刻的你，也只是一个人类。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 21,
    },
    {
      id: 'ln-23', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'right', characterName: '普瑞赛斯',
      text: '你为了反抗我，竟然会做到这一步——',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 22,
    },
    {
      id: 'ln-24', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'left', characterName: '凯尔希',
      text: '普瑞赛斯，你不是泰拉的造物主。这片大地上的一切生命，没有义务顺应你的意愿。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 23,
    },
    {
      id: 'ln-25', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'left', characterName: '凯尔希',
      text: '......这是我对你的报复，也是最后的反抗。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 24,
    },
    {
      id: 'ln-26', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'narrator', characterName: '',
      text: '你看到站在对面的女性脸上露出了一丝犹疑，但紧接着，源石开始在她的身旁环绕。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 25,
    },
    {
      id: 'ln-27', storyId: '__test__', sceneId: 'sc-1',
      speaker: 'left', characterName: '凯尔希',
      text: '......太迟了。',
      leftImage: 'char1.png', rightImage: 'char3.png', order: 26,
    },
  ],
  choices: [],
};

export default TEST_STORY;
