import { Template } from "meteor/templating";
import { Session } from "meteor/session";
import "./main.html";

ABI_ARRAY = [{"constant":true,"inputs":[],"name":"sundryData","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"certificateIssuer","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"idHash","outputs":[{"name":"","type":"bytes32"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"deleteCertificate","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"isDeleted","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"inputs":[{"name":"hash","type":"bytes32"},{"name":"sundry","type":"string"}],"payable":false,"type":"constructor"}];
BYTE_CODE = "6060604052341561000f57600080fd5b6040516104b13803806104b1833981016040528080519060200190919080518201919050505b336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550816001816000191690555080600290805190602001906100969291906100ba565b506000600360006101000a81548160ff0219169083151502179055505b505061015f565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106100fb57805160ff1916838001178555610129565b82800160010185558215610129579182015b8281111561012857825182559160200191906001019061010d565b5b509050610136919061013a565b5090565b61015c91905b80821115610158576000816000905550600101610140565b5090565b90565b6103438061016e6000396000f30060606040526000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff168063083dfe681461006a5780635455e36b146100f9578063aa4107321461014e578063afa936b81461017f578063d7efb6b714610194575b600080fd5b341561007557600080fd5b61007d6101c1565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156100be5780820151818401525b6020810190506100a2565b50505050905090810190601f1680156100eb5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b341561010457600080fd5b61010c61025f565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b341561015957600080fd5b610161610284565b60405180826000191660001916815260200191505060405180910390f35b341561018a57600080fd5b61019261028a565b005b341561019f57600080fd5b6101a7610304565b604051808215151515815260200191505060405180910390f35b60028054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156102575780601f1061022c57610100808354040283529160200191610257565b820191906000526020600020905b81548152906001019060200180831161023a57829003601f168201915b505050505081565b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60015481565b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161415156102e557600080fd5b6001600360006101000a81548160ff0219169083151502179055505b5b565b600360009054906101000a900460ff16815600a165627a7a7230582009e651caf5d336c4233a93f7dbf345b82f62d77489c9a9cf4183f789750aacad0029";

var Address;

Certificates = new Mongo.Collection("certificates");

function getContract(certificateAddress) {
  return web3.eth.contract(ABI_ARRAY).at(certificateAddress);
}

function createContract(candidateName, candidateDOB, sundryData) {
  var hash =
    "0x" +
    SHA256(
      candidateName.toString().toLowerCase() +
        candidateDOB.toString().toLowerCase()
    )
      .toString()
      .toLowerCase();
  var sundry = sundryData;
  var certificateContract = web3.eth.contract(ABI_ARRAY);
  var certificate = certificateContract.new(
    hash,
    sundry,
    {
      from: Address,
      data: BYTE_CODE,
      gas: "4000000"
    },
    function(e, contract) {
      console.log(e, contract);
      if (typeof contract.address !== "undefined") {
        console.log(
          "Contract mined! address: " +
            contract.address +
            " transactionHash: " +
            contract.transactionHash
        );
        Certificates.insert({
          idHash: hash,
          certificateIssuer: Address,
          certificateAddress: contract.address,
          timeStamp: Date.now() / 1000
        });
      }
    }
  );
}

function getCertificateFromBlockchain(certificateAddress, template) {
    //So that certificates aren't shown when the db loads before the blockchain query returns
    TemplateVar.set(template, "isDeleted", true);
    myContract = getContract(certificateAddress);

  TemplateVar.set(template, "certificateAddress", certificateAddress);

  myContract.idHash(function(err, res) {
    TemplateVar.set(template, "idHash", res);
  });
  myContract.certificateIssuer(function(err, res) {
    TemplateVar.set(template, "certificateIssuer", res);
  });
  myContract.sundryData(function(err, res) {
    TemplateVar.set(template, "sundryData", res);
  });
  myContract.isDeleted(function(err,res){
      console.log(res);
      TemplateVar.set(template, "isDeleted", res);
  });
}

function deleteCertificate(certificateAddress) {
  var myContract = getContract(certificateAddress);
  myContract.deleteCertificate(function(err, res){
      console.log(err);
      if(!err) console.log("hi" + res);
  });
}

Template.registerHelper("compare", function(v1, v2) {
  if (typeof v1 === "object" && typeof v2 === "object") {
    return _.isEqual(v1, v2);
  } else {
    return v1 === v2;
  }
});

Template.registerHelper("formatDate", function(date) {
  var timeStamp = new Date(date * 1000);
  return moment(timeStamp).format("YYYY-MM-DD");
});

Template.CandidateSearch.onCreated(function() {
  Session.set("certificateSearchResults", null);
  Session.set("searchType", "candidateNameDOB");
  Session.set("commonMetaData", null);
});

Template.ChildCertificate.onCreated(function() {
  var template = Template.instance();
  var address = template.data.resultCertificateAddress;
  getCertificateFromBlockchain(address, template);
});

Template.WalletBallance.helpers({
  getEthBallance: function() {
    var template = Template.instance();
    web3.eth.getAccounts(function(err, res) {
      if (!err) {
        Address = res[0];
        TemplateVar.set(template, "walletAddress", Address);
        web3.eth.getBalance(Address, function(err, res) {
          ethBlance = web3.fromWei(res, "ether");
          TemplateVar.set(template, "walletBallance", ethBlance);
        });
      }
    });
  }
});

Template.CandidateSearch.helpers({
  searchResults: function() {
    return Session.get("certificateSearchResults");
  },
  commonMetaData: function() {
    return Session.get("commonMetaData");
  },
  commonMetaDataText: function() {
    return Session.get("commonMetaDataText");
  },
  searchType: function() {
    return Session.get("searchType");
  }
});

Template.CandidateSearch.events({
  "click .searchType": function(event, t) {
    Session.set("searchType", event.target.value);
    Session.set("certificateSearchResults", null);
  },

  "submit .candidateSearch": function(event, t) {
    var template = Template.instance();

    var searchResults;
    var commonMetaData;
    var commonMetaDataText;
    switch (Session.get("searchType")) {
      case "candidateNameDOB":
        var candidateName = event.target.candidateName.value;
        var candidateDOB = event.target.candidateDOB.value;
        var idHash =
          "0x" +
          SHA256(
            candidateName.toString().toLowerCase() +
              candidateDOB.toString().toLowerCase()
          )
            .toString()
            .toLowerCase();
        searchResults = Certificates.find(
          { idHash: idHash },
          { sort: { timeStamp: -1 } }
        ).fetch();
        commonMetaData = searchResults.length;
        commonMetaDataText =
          "Number of certificates issued to candidate: " + commonMetaData;
        break;
      case "candidateIdHash":
        var idHash = event.target.idHash.value;
        searchResults = Certificates.find(
          { idHash: idHash },
          { sort: { timeStamp: -1 } }
        ).fetch();
        commonMetaData = searchResults.length;
        commonMetaDataText =
          "Number of certificates issued to candidate: " + commonMetaData;
        break;
      case "certificateAddress":
        var certificateAddress = event.target.certificateAddress.value;
        searchResults = Certificates.find(
          {
            certificateAddress: certificateAddress
          },
          { sort: { timeStamp: -1 } }
        ).fetch();
        break;
      case "certificateIssuer":
        var certificateIssuer = event.target.certificateIssuer.value;
        searchResults = Certificates.find(
          {
            certificateIssuer: certificateIssuer
          },
          { sort: { timeStamp: -1 } }
        ).fetch();
        commonMetaData = searchResults.length;
        commonMetaDataText =
          "Number of certificates issued by institition: " + commonMetaData;
        break;
    }
    Session.set("certificateSearchResults", searchResults);
    Session.set("commonMetaData", commonMetaData);
    Session.set("commonMetaDataText", commonMetaDataText);
    return false;
  },

  "click .resetSearch": function(event, t) {
    Session.set("certificateSearchResults", null);
  }
});

Template.CreateNewCertificateForm.events({
  "submit .newCertificateForm": function(event, t) {
    var candidateName = event.target.candidateName.value;
    var candidateDOB = event.target.candidateDOB.value;
    var sundryData = event.target.sundryData.value;
    createContract(candidateName, candidateDOB, sundryData);
    return false;
  }
});

Template.DeleteCertificateForm.events({
  "submit .deleteCertificateForm": function(event, t) {
    var certificateAddress = event.target.certificateAddress.value;
    deleteCertificate(certificateAddress);
  }
});
