import { CovalentClient } from "@covalenthq/client-sdk";
import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectItem,
  Grid,
  Col,
  Card,
  Text,
  TextInput,
  Icon,
  Button,
  Title,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  NumberInput,
  Badge,
  Subtitle,
} from "@tremor/react";
import { CheckIcon, XIcon } from "@heroicons/react/outline";
import "./App.css";
import axios from "axios";

function App() {
  const [count, setCount] = useState(0);
  const [respChains, setRespChains] = useState([]);
  const [cqtAPIKEY, setCqtAPIKEY] = useState("");
  const [apiOK, setApiOK] = useState(false);
  const [blockchain, setBlockchain] = useState("");
  const [blockchainHeight, setBlockchainHeight] = useState("");
  const [tokenData, setTokenData] = useState([]);
  const [asyncData, setAsyncData] = useState();
  const [currentQuery, setCurrentQuery] = useState(1);
  const [numBlocks, setNumBlocks] = useState(1000);
  const [queryComplete, setQueryComplete] = useState(true);

  //handles debounce when api is added and loaded
  const buttonToggle = () => {
    setCount(count + 1);
  };

  // handles loading of api keys and list of blockchain that covalent supports
  useEffect(() => {
    const getData = async () => {
      var client = new CovalentClient(cqtAPIKEY);
      var data = await client.BaseService.getAllChains();
      return data;
    };
    getData()
      .then((data) => {
        setApiOK(false);
        if (data && data.data) {
          var hashmapChain = {};
          var arrayChain = [];
          data.data.items.forEach((x) => {
            hashmapChain[x.name] = 1;
          });
          Object.keys(hashmapChain).forEach((x) => {
            arrayChain.push(x);
          });
          setRespChains(arrayChain);
          setApiOK(true);
        } else {
          setRespChains([]);
        }
      })
      .catch(console.error);
  }, [count]);

  // handles blockchain latest height and gets approvals
  useEffect(() => {
    const getData = async () => {
      var client = new CovalentClient(cqtAPIKEY);
      var data = client.BaseService.getBlock(blockchain, "latest");
      return data;
    };
    getData()
      .then((data) => {
        if (data && data.data) {
          //console.log(data.data.items[0].height);
          setBlockchainHeight(data.data.items[0].height - 200);
          setCurrentQuery(currentQuery + 1);
        } else {
          setBlockchainHeight(0);
        }
      })
      .catch(console.error);
  }, [blockchain]);

  // on blockchain height updated, make changes
  useEffect(() => {
    var minBlock = blockchainHeight - numBlocks;
    var templateUrl =
      "https://api.covalenthq.com/v1/{chain}/events/topics/0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925/?starting-block={start}&ending-block={end}&page-number={page_index}&page-size=100&key={key}";
    const getData = async () => {
      var returnData = [];
      if (!apiOK) {
        setAsyncData([]);
        return returnData;
      }
      try {
        setAsyncData([]);
        setQueryComplete(false);
        console.log("Log Event Started");
        var hasNextPage = true;
        var pageNumber = 0;
        var localQueryID = currentQuery;
        while (hasNextPage) {
          var url = templateUrl
            .replace("{chain}", blockchain)
            .replace("{start}", minBlock)
            .replace("{end}", blockchainHeight)
            .replace("{key}", cqtAPIKEY)
            .replace("{page_index}", pageNumber);
          var resp = await axios.get(url);
          //console.log(resp.data.data)
          resp.data.data.items.forEach((x) => {
            returnData.push(x);
            //setAsyncData(JSON.parse(JSON.stringify(returnData)))
            setAsyncData([...returnData]);
          });
          hasNextPage = resp.data.data.pagination.has_more;
          pageNumber += 1;
          //console.log("queryID %d %d", localQueryID, currentQuery)
          //console.log("Array Len: %d", returnData.length)
          if (localQueryID != currentQuery) {
            break;
          }
        }
        setQueryComplete(true);
        console.log("Log Event Ended");
        setAsyncData(returnData);
        return returnData;
      } catch (error) {
        console.log(error.message);
      }
      setAsyncData(returnData);
      return returnData;
    };
    getData()
      .then((x) => {
        setAsyncData(x);
      })
      .catch(console.error);
  }, [blockchainHeight, currentQuery, numBlocks]);

  // async update of counts
  useEffect(() => {
    var addressMap = {};
    if (asyncData) {
      // print data
      //console.log(asyncData);
      // remap the data
      asyncData.forEach((x) => {
        if (addressMap[x.sender_address]) {
          addressMap[x.sender_address].count += 1;
        } else {
          addressMap[x.sender_address] = { name: x.sender_name, count: 1 };
        }
      });
      // sort
      //console.log("addressMap.keys")
      //console.log(JSON.stringify(addressMap))
      var tokenDataTmp = [];
      Object.keys(addressMap).forEach((key) => {
        //console.log(key);
        //console.log(addressMap[key]);
        tokenDataTmp.push({
          address: key,
          count: addressMap[key].count,
          name: addressMap[key].name,
        });
      });
      //console.log("tokenDataTmp");
      //console.log(tokenDataTmp);
      var fiteredTokenData = tokenDataTmp
        .sort((a, b) => {
          return b.count - a.count;
        })
        .filter((x) => {
          return x.count > 9;
        });
      setTokenData(fiteredTokenData);
    } else {
      // todo
    }
  }, [asyncData]);

  return (
    <Grid numItems={6} className="p-6 m-6">
      <Col numColSpan={6}>
        <Card>
          <Title>Antonidas Token Approvals Tracker</Title>
        </Card>
      </Col>
      <Col numColSpan={3}>
        <Card>
          <Grid numItems={3}>
            <Col>
              <Text>API KEY</Text>
              <TextInput
                type="password"
                onValueChange={setCqtAPIKEY}
                placeholder="Covalent API KEY"
              ></TextInput>
            </Col>
            <Col>
              <Text>Load API KEY</Text>
              <Button onClick={buttonToggle}>Load!</Button>
            </Col>
            <Col>
              <Text>API Key Loaded?</Text>
              <Icon icon={apiOK ? CheckIcon : XIcon}></Icon>
            </Col>
          </Grid>
        </Card>
      </Col>
      <Col numColSpan={2}>
        <Card>
          <Text>Blockchains</Text>
          <Select placeholder="Blockchains..." onChange={setBlockchain}>
            {respChains == undefined || respChains.length == 0 ? (
              <></>
            ) : (
              respChains
                .sort((a, b) => {
                  return a < b ? -1 : 1;
                })
                .map((x) => {
                  return (
                    <SelectItem value={x} key={x}>
                      {x}
                    </SelectItem>
                  );
                })
            )}
          </Select>
        </Card>
      </Col>
      <Col numColSpan={1}>
        <Card>
          <Text>Blocks to look back..</Text>
          <NumberInput step={1000} defaultValue={numBlocks} onValueChange={setNumBlocks} />
        </Card>
      </Col>
      <Col numColSpan={6}>
        <Card>
          {queryComplete ? (
            tokenData == "" ? (
              <></>
            ) : (
              <Badge color="green">Query Completed!</Badge>
            )
          ) : (
            <Badge color="red">Query Still loading...</Badge>
          )}
          {tokenData == "" ? (
            <Subtitle>Fill in your API key and Select your blockchain.</Subtitle>
          ) : (
            <Table>
              <TableHead>
                <TableHeaderCell>Coin Name</TableHeaderCell>
                <TableHeaderCell>Address</TableHeaderCell>
                <TableHeaderCell>Approval Count</TableHeaderCell>
              </TableHead>
              <TableBody>
                {tokenData.map((x) => {
                  return (
                    <TableRow key={x.address}>
                      <TableCell>{x.name}</TableCell>
                      <TableCell>{x.address}</TableCell>
                      <TableCell>{x.count}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </Col>
    </Grid>
  );
}

export default App;
