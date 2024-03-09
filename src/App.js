import logo from './logo.svg';
import './App.css';
import videojs from "video.js";
import TCPlayer from 'tcplayer.js';
import 'tcplayer.js/dist/tcplayer.min.css';
import {useEffect, useState} from "react";
import {Col, Row, message, Button, List, Avatar, Progress, FloatButton} from "antd";
import moment from "moment";

function App() {
    const [data,setData] = useState([]);
    const [loading,setLoading] = useState(true);
    const [listSize,setListSize] = useState(0);
    const [manifest, setManifest] = useState();
    const [programme, setProgramme] = useState();
    const [messageApi, contextHolder] = message.useMessage();

    //获取播放列表及EPG数据
    const loadIptvList = async () => {
        await fetch("https://mirror.ghproxy.com/https://raw.githubusercontent.com/Meroser/IPTV/main/IPTV.m3u")
            .then((data) => {
                data.text().then((res) => {
                    var m3u8Parser = require('m3u8-parser');
                    var parser = new m3u8Parser.Parser({
                        expression: /^tvg-id/,
                        customType: 'tvg-id'
                    });
                    parser.push(res);
                    parser.end();
                    var parsedManifest = parser.manifest;
                    setManifest(parsedManifest);

                    //获取EPG信息
                    fetch("https://mirror.ghproxy.com/https://raw.githubusercontent.com/Meroser/IPTV/main/tvxml.xml")
                        .then((data1)=>{
                            data1.text().then((res1)=>{
                                const { XMLParser } = require("fast-xml-parser");
                                const parser = new XMLParser({ignoreAttributes:false,attributeNamePrefix : "_",textNodeName: "_text"});
                                let jObj = parser.parse(res1);
                                setProgramme(jObj.tv.programme)

                                onLoadMore(parsedManifest.segments,jObj.tv.programme)
                            })
                        }).catch((reason) => {
                            console.log(reason)
                            messageApi.error("播放列表加载失败");
                        })
                });
            }).catch((reason) => {
                console.log(reason)
                messageApi.error("播放列表加载失败");
            });
    }

    //加载更多按钮
    const  onLoadMore = (listData,proData) => {
        let list = listData===undefined?manifest.segments:listData
        let proList = proData===undefined?programme:proData

        let sizeEnd;
        if((listSize+10)<=list.length){
            sizeEnd=listSize+10
            setListSize(listSize+10)
        }else{
            sizeEnd=list.length;
            setLoading(false);
        }

        let tempData = data;
        for (let i = listSize; i < sizeEnd; i++) {
            let value = list[i];
            let tvgid = value.title.split(" ")[1].split("=")[1].replaceAll("\"","");
            let tvgname = value.title.split(" ")[2].split("=")[1].replaceAll("\"","");
            let tvglogo = value.title.split(" ")[3].split("=")[1].replaceAll("\"","");

            //筛选出当前正在播放发节目名称
            let now = moment().format("yyyyMMDDHHmmss");
            let nowplay = "";
            let playTime = "";
            let percent;
            let a = proList.filter((value)=>{
                let start = value._start.split(" ")[0];
                let stop = value._stop.split(" ")[0];
                if(now>=start&&now<=stop&&value._channel===tvgid){
                    return value
                }
            })
            if(a.length>0){
                let start = moment(a[0]._start.split(" ")[0],'YYYYMMDDHHmmss').format("HH:mm")
                let stop = moment(a[0]._stop.split(" ")[0],'YYYYMMDDHHmmss').format("HH:mm")
                nowplay = `当前播放：${a[0].title._text}`;
                playTime = `${start}-${stop}`
                percent = (now-a[0]._start.split(" ")[0])/(a[0]._stop.split(" ")[0]-a[0]._start.split(" ")[0])*100;
            }

            tempData.push({
                title:value.uri,
                tvgname:tvgname,
                tvglogo:tvglogo,
                nowplay:nowplay,
                playTime:playTime,
                percent:Number(percent.toFixed(0))
            })
        }
        setData(tempData)
    }
    const loadMore = loading && (
        <div
            style={{
                textAlign: 'center',
                marginTop: 12,
                height: 32,
                lineHeight: '32px',
            }}
        >
            <Button onClick={()=>{onLoadMore()}}>加载更多...</Button>
        </div>
    )

    useEffect(()=>{
        loadIptvList();
        /*const player = TCPlayer('player-container-id', {
            sources: [{
                src: 'http://[2409:8087:7000:20:1000::22]:6060/yinhe/2/ch00000090990000001339/index.m3u8?virtualDomain=yinhe.live_hls.zte.com', // 播放地址
            }],
            hlsConfig: [{
                videoType: 'LIVE'
            }],
            licenseUrl: 'https://license.vod2.myqcloud.com/license/v2/1306810858_1/v_cube.license', // license 地址，参考准备工作部分，在视立方控制台申请 license 后可获得 licenseUrl
        });*/
    },[])

    /*const player = TCPlayer('player-container-id', {
        sources: [{
            src: 'http://[2409:8087:7000:20:1000::22]:6060/yinhe/2/ch00000090990000001339/index.m3u8?virtualDomain=yinhe.live_hls.zte.com', // 播放地址
        }],
        licenseUrl: 'https://license.vod2.myqcloud.com/license/v2/1306810858_1/v_cube.license', // license 地址，参考准备工作部分，在视立方控制台申请 license 后可获得 licenseUrl
    });*/

    return (
        <div style={{padding:"20px"}}>
            {contextHolder}
            <Row>
                <Col span={18}><Button type="primary" onClick={()=>{messageApi.success('111')}}>左</Button></Col>
                <Col span={6}>
                    <List
                        itemLayout="vertical"
                        dataSource={data}
                        loadMore={loadMore}
                        renderItem={(item, index) => (
                            <List.Item>
                                <List.Item.Meta
                                    avatar={<Avatar src={item.tvglogo} style={{width:"81px",height:"48px"}} shape="square" />}
                                    title={<a href={item.title} target="_blank">{index+1}.{item.tvgname}</a>}
                                    description= {item.nowplay}
                                />
                                <Progress percent={item.percent} size="small" format={()=>item.playTime} />
                            </List.Item>
                        )}
                        style={{height:"calc(100vh - 50px)",overflowY:"auto"}}
                        id="li"
                    />
                    <FloatButton.BackTop target={()=>document.getElementById("li")} />
                </Col>
            </Row>
        </div>
      /*<video id="roomVideo" width="800" height="600" controls preload="auto" data-setup="{}" crossOrigin="Anonymous">
          <source src="http://[2409:8087:7000:20:1000::22]:6060/yinhe/2/ch00000090990000001339/index.m3u8?virtualDomain=yinhe.live_hls.zte.com" type="application/x-mpegURL"></source>
      </video>*/
    /*<video id="player-container-id" width="800" height="600" preload="auto" playsInline>
    </video>*/

);
}

export default App;
